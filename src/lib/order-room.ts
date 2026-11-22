import "server-only";
import { rm } from "node:fs/promises";
import path from "node:path";
import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { editorProfiles, orderFiles, orderMessages, orders, users, type Order } from "@/db/schema";
import { CHAT, ORDER_FILES } from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * Loyiha xonasi: buyurtma ichidagi chat va fayllar (Telegramsiz).
 *
 *  - Chat mutaxassis aniqlangach ochiladi (to'g'ridan-to'g'ri buyurtma — darhol, ochiq e'lon — taklif tanlangach).
 *  - Yozish: PENDING, IN_PROGRESS, DELIVERED, COMPLETED (yakunlangach ham yozishish mumkin — keyingi buyurtma
 *    ham shu yerda kelishilsin). Bekor qilingan buyurtmada — faqat o'qish.
 *  - Fayl yuklash: faqat PENDING, IN_PROGRESS, DELIVERED.
 */

export type RoomRole = "client" | "editor" | "admin";

const WRITE_STATUSES = new Set(["PENDING", "IN_PROGRESS", "DELIVERED", "COMPLETED"]);
const UPLOAD_STATUSES = new Set(["PENDING", "IN_PROGRESS", "DELIVERED"]);

export const roomVisible = (o: Pick<Order, "editorId" | "status">) => !!o.editorId && o.status !== "OPEN";
export const canWrite = (o: Pick<Order, "editorId" | "status">) => roomVisible(o) && WRITE_STATUSES.has(o.status);
export const canUpload = (o: Pick<Order, "editorId" | "status">) => roomVisible(o) && UPLOAD_STATUSES.has(o.status);

/** Buyurtma va foydalanuvchining undagi o'rni (ishtirokchi bo'lmasa — role: null) */
export async function orderAccess(orderId: string, user: { id: string; role: string }) {
  const [row] = await db
    .select({ o: orders, editorUserId: editorProfiles.userId })
    .from(orders)
    .leftJoin(editorProfiles, eq(editorProfiles.id, orders.editorId))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) return null;
  const role: RoomRole | null =
    row.o.clientId === user.id ? "client" : row.editorUserId === user.id ? "editor" : user.role === "ADMIN" ? "admin" : null;
  return { order: row.o, editorUserId: row.editorUserId, role };
}

// ---------------- fayllar diskda ----------------
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export const orderFilesDir = () => path.join(env.uploadDir, "order-files");

/** Tayyor fayl: uploads/order-files/<id>; yuklanayotgan: <id>.part (asl nom faqat bazada — diskda xavfsiz nom) */
export function orderFilePath(id: string, part = false) {
  if (!UUID_RE.test(id)) throw new Error("bad id");
  return path.join(orderFilesDir(), part ? `${id}.part` : id);
}

export async function removeOrderFileFromDisk(id: string) {
  await Promise.all([rm(orderFilePath(id), { force: true }), rm(orderFilePath(id, true), { force: true })]);
}

/**
 * Buyurtmadagi band disk joyi (yuklanayotganlar ham hisoblanadi — limitni ikki tabdan aylanib o'tib bo'lmasin).
 * Telegram orqali yuborilgan fayllar diskimizni egallamaydi — hisobga kirmaydi.
 */
export async function orderUsage(orderId: string) {
  const [r] = await db
    .select({
      bytes: sql<number>`coalesce(sum(${orderFiles.size}), 0)::float8`,
      count: sql<number>`count(*)::int`,
    })
    .from(orderFiles)
    .where(and(eq(orderFiles.orderId, orderId), ne(orderFiles.status, "deleted"), eq(orderFiles.storage, "disk")));
  return { bytes: Number(r.bytes), count: r.count };
}

/** Fayllar qachon avtomatik o'chadi: buyurtma yopilgandan keyin N kun (yopilmagan bo'lsa — null) */
export function filesExpireAt(o: Pick<Order, "status" | "updatedAt">) {
  if (o.status !== "COMPLETED" && o.status !== "CANCELLED") return null;
  return new Date(o.updatedAt.getTime() + ORDER_FILES.keepDaysAfterClose * 86_400_000);
}

// ---------------- xabarlar ----------------
export type RoomFile = {
  id: string;
  name: string;
  size: number;
  mime: string;
  purpose: string;
  status: string;
  /** disk — saytdan yuklab olinadi; telegram — bot orqali olinadi */
  storage: string;
  uploaderId: string;
  createdAt: string;
};

export type RoomMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorImage: string | null;
  body: string;
  masked: boolean;
  createdAt: string;
  file: RoomFile | null;
};

const fileCols = {
  id: orderFiles.id,
  name: orderFiles.name,
  size: orderFiles.size,
  mime: orderFiles.mime,
  purpose: orderFiles.purpose,
  status: orderFiles.status,
  storage: orderFiles.storage,
  uploaderId: orderFiles.uploaderId,
  createdAt: orderFiles.createdAt,
};

type FileRow = Omit<RoomFile, "createdAt"> & { createdAt: Date };
const toFile = (f: FileRow): RoomFile => ({ ...f, createdAt: f.createdAt.toISOString() });

/** Xabarlar (eskidan yangiga). `after` berilsa — faqat undan keyingilari (ochiq sahifa yangilanishi uchun) */
export async function listMessages(orderId: string, after?: Date): Promise<RoomMessage[]> {
  const where = after
    ? and(eq(orderMessages.orderId, orderId), gt(orderMessages.createdAt, after))
    : eq(orderMessages.orderId, orderId);
  const rows = await db
    .select({
      m: orderMessages,
      // Mutaxassis — profildagi nomi bilan, mijoz — akkaunt nomi bilan
      authorName: sql<string>`coalesce(${editorProfiles.displayName}, ${users.name})`,
      authorImage: users.image,
      f: fileCols,
    })
    .from(orderMessages)
    .leftJoin(users, eq(users.id, orderMessages.authorId))
    .leftJoin(editorProfiles, eq(editorProfiles.userId, orderMessages.authorId))
    .leftJoin(orderFiles, eq(orderFiles.id, orderMessages.fileId))
    .where(where)
    .orderBy(desc(orderMessages.createdAt))
    .limit(CHAT.history);
  return rows.reverse().map((r) => ({
    id: r.m.id,
    authorId: r.m.authorId,
    authorName: r.authorName ?? "",
    authorImage: r.authorImage ?? null,
    body: r.m.body,
    masked: r.m.masked,
    createdAt: r.m.createdAt.toISOString(),
    file: r.f?.id ? toFile(r.f as FileRow) : null,
  }));
}

export async function listFiles(orderId: string): Promise<RoomFile[]> {
  const rows = await db
    .select(fileCols)
    .from(orderFiles)
    .where(and(eq(orderFiles.orderId, orderId), inArray(orderFiles.status, ["ready", "deleted"])))
    .orderBy(asc(orderFiles.createdAt));
  return rows.map(toFile);
}

/**
 * Tizim xabari (holat o'zgardi): matn o'rniga kalit saqlanadi ("sys:accepted") va har kimga o'z tilida ko'rsatiladi.
 * Faqat mutaxassis aniqlangan buyurtmalarda (aks holda xona hali ochilmagan).
 */
export async function postSystemMessage(orderId: string, key: string) {
  await db.insert(orderMessages).values({ orderId, authorId: null, body: `sys:${key}` });
  await db.update(orders).set({ lastMessageAt: new Date() }).where(eq(orders.id, orderId));
}

/** Foydalanuvchi xonani ko'rdi — "yangi xabar" belgisi o'chadi */
export async function markRead(orderId: string, role: RoomRole | null) {
  if (role !== "client" && role !== "editor") return;
  const col = role === "client" ? { clientReadAt: new Date() } : { editorReadAt: new Date() };
  await db.update(orders).set(col).where(eq(orders.id, orderId));
}

// ---------------- avtomatik tozalash (video ishchisi har 10 daqiqada chaqiradi) ----------------
/**
 * Disk to'lmasligi uchun:
 *  1) yarim yo'lda qolgan yuklashlar (ORDER_FILES.abandonedUploadHours dan eski) o'chiriladi;
 *  2) yakunlangan/bekor qilingan buyurtma fayllari ORDER_FILES.keepDaysAfterClose kundan keyin o'chiriladi;
 *  3) tashlab ketilgan (ORDER_FILES.keepDaysIdle kun hech qanday harakat bo'lmagan) buyurtma fayllari o'chiriladi;
 *  4) bazada yozuvi yo'q "yetim" fayllar (1 kundan eski) diskdan o'chiriladi.
 * Yozuvlar "deleted" holatida qoladi — chatda "Fayl o'chirilgan" deb ko'rinadi.
 * Telegram orqali yuborilgan fayllarga tegilmaydi: ular Telegram serverida, diskimizni egallamaydi.
 */
export async function cleanupOrderFiles() {
  const { readdir, stat: statFile } = await import("node:fs/promises");
  const removed = await db.execute<{ id: string }>(sql`
    UPDATE order_files f SET status = 'deleted', deleted_at = now()
      FROM orders o
     WHERE o.id = f.order_id AND f.status <> 'deleted' AND f.storage = 'disk' AND (
           (f.status = 'uploading' AND f.created_at < now() - make_interval(hours => ${ORDER_FILES.abandonedUploadHours}))
        OR (o.status IN ('COMPLETED', 'CANCELLED') AND o.updated_at < now() - make_interval(days => ${ORDER_FILES.keepDaysAfterClose}))
        OR (greatest(o.updated_at, coalesce(o.last_message_at, o.updated_at)) < now() - make_interval(days => ${ORDER_FILES.keepDaysIdle}))
     )
    RETURNING f.id`);
  for (const r of removed) await removeOrderFileFromDisk(r.id);
  if (removed.length) console.log(`[order-files] cleaned ${removed.length} file(s)`);

  let names: string[] = [];
  try {
    names = await readdir(orderFilesDir());
  } catch {
    return;
  }
  const dayAgo = Date.now() - 86_400_000;
  const candidates: { id: string; file: string }[] = [];
  for (const n of names) {
    const m = /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(\.part)?$/.exec(n);
    const full = path.join(orderFilesDir(), n);
    const st = await statFile(full).catch(() => null);
    if (!st || st.mtimeMs > dayAgo) continue;
    if (!m) await rm(full, { force: true });
    else candidates.push({ id: m[1], file: full });
  }
  if (!candidates.length) return;
  const alive = await db
    .select({ id: orderFiles.id })
    .from(orderFiles)
    .where(
      and(
        inArray(
          orderFiles.id,
          candidates.map((c) => c.id),
        ),
        inArray(orderFiles.status, ["uploading", "ready"]),
      ),
    );
  const keep = new Set(alive.map((a) => a.id));
  for (const c of candidates) if (!keep.has(c.id)) await rm(c.file, { force: true });
}
