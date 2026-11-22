import { createReadStream } from "node:fs";
import { mkdir, open, rename, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { orderFiles, orderMessages, orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/current";
import { ORDER_FILES } from "@/lib/constants";
import { env } from "@/lib/env";
import { getDict } from "@/lib/i18n";
import { notifyOrder } from "@/lib/notify";
import { orderAccess, orderFilePath, orderFilesDir, removeOrderFileFromDisk } from "@/lib/order-room";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Loyiha xonasi fayllari (Telegramsiz material almashish).
 *
 *  PUT /api/order-files/<id>?offset=<bayt> — bo'laklab yuklash (tana — faylning keyingi bo'lagi, ≤ ORDER_FILES.chunkBytes).
 *    Bo'lak to'g'ridan-to'g'ri diskka yoziladi (xotira to'lmaydi); uzilsa — o'sha bo'lak qayta yuboriladi;
 *    offset mos kelmasa — 409 va { received }: brauzer shu joydan davom etadi. Oxirgi bo'lakdan keyin fayl
 *    "ready" bo'ladi va chatda "fayl yukladi" xabari chiqadi. Fayllar siqilmaydi — asl sifat saqlanadi.
 *
 *  GET /api/order-files/<id>[?inline=1] — yuklab olish, faqat buyurtma ishtirokchilari va admin. Range qo'llab-quvvatlanadi
 *    (katta fayl uzilsa davom ettiriladi, video oldinga o'tkaziladi).
 */

const busy = new Set<string>();
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return host === req.headers.get("host") || host === new URL(env.appUrl).host;
  } catch {
    return false;
  }
}

async function sizeOf(file: string) {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
}

async function loadFile(id: string) {
  const [f] = await db.select().from(orderFiles).where(eq(orderFiles.id, id)).limit(1);
  return f ?? null;
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const [d, user, { id }] = await Promise.all([getDict(), getCurrentUser(), ctx.params]);
  if (!sameOrigin(req)) return json(403, { message: d.errors.forbidden });
  if (!user) return json(401, { message: d.errors.unauthorized });
  if (!UUID_RE.test(id)) return json(404, { message: d.errors.notFound });
  if (!rateLimit(`order-chunk:${user.id}`, 300, 60_000).ok) return json(429, { message: d.errors.rateLimit });

  const offset = Number(new URL(req.url).searchParams.get("offset"));
  if (!Number.isSafeInteger(offset) || offset < 0) return json(400, { message: d.errors.validation });

  const f = await loadFile(id);
  if (!f || f.uploaderId !== user.id) return json(404, { message: d.errors.notFound });
  if (f.status === "ready") return json(200, { received: f.size, done: true });
  if (f.status !== "uploading") return json(410, { message: d.errors.notFound });

  if (busy.has(id)) return json(429, { message: d.errors.rateLimit, busy: true });
  busy.add(id);
  try {
    const part = orderFilePath(id, true);
    await mkdir(orderFilesDir(), { recursive: true });
    const size = await sizeOf(part);
    if (offset !== size) return json(409, { received: size });

    const max = Math.min(ORDER_FILES.chunkBytes, f.size - size);
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (max <= 0 || declared > max) return json(413, { message: d.errors.validation, received: size });
    if (!req.body) return json(400, { message: d.errors.validation, received: size });

    const fh = await open(part, "a");
    let written = 0;
    try {
      const reader = req.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        written += value.byteLength;
        if (written > max) {
          await reader.cancel().catch(() => {});
          throw new Error("chunk too large");
        }
        await fh.write(value);
      }
    } catch (e) {
      // Bo'lak to'liq kelmadi — yozilganini qaytarib kesamiz, brauzer shu bo'lakni qayta yuboradi
      await fh.truncate(size).catch(() => {});
      await fh.close();
      if (written > max) return json(413, { message: d.errors.validation, received: size });
      throw e;
    }
    await fh.close();
    if (written === 0) return json(400, { message: d.errors.validation, received: size });

    const received = size + written;
    if (received < f.size) return json(200, { received });

    // Oxirgi bo'lak: avval faylni joyiga qo'yamiz (keyin "ready" — yo'q faylga havola chiqmasin), so'ng chatga xabar
    await rename(part, orderFilePath(id));
    const [row] = await db
      .update(orderFiles)
      .set({ status: "ready", readyAt: new Date() })
      .where(and(eq(orderFiles.id, id), eq(orderFiles.status, "uploading")))
      .returning({ id: orderFiles.id });
    if (!row) {
      // Yuklash paytida o'chirilgan (bekor qilingan)
      await removeOrderFileFromDisk(id);
      return json(410, { message: d.errors.notFound });
    }
    const now = new Date();
    await db.insert(orderMessages).values({ orderId: f.orderId, authorId: user.id, fileId: id, createdAt: now });
    await db.update(orders).set({ lastMessageAt: now }).where(eq(orders.id, f.orderId));
    after(() => notifyOrder(f.orderId, "file", user.id, `${user.name}: 📎 ${f.name}`));
    return json(200, { received, done: true });
  } finally {
    busy.delete(id);
  }
}

// Brauzerda ko'rsa bo'ladigan turlar (faqat ?inline=1 bilan); qolganlari har doim yuklab olinadi
const INLINE = new Set(["video/mp4", "video/webm", "video/quicktime", "image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/mp4", "audio/wav"]);

function disposition(kind: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7e]+/g, "_").replace(/["\\]/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([getCurrentUser(), ctx.params]);
  const notFound = () => new Response("Not found", { status: 404 });
  if (!user || !UUID_RE.test(id)) return notFound();
  const f = await loadFile(id);
  if (!f || f.status !== "ready") return notFound();
  const acc = await orderAccess(f.orderId, user);
  if (!acc?.role) return notFound();

  const file = orderFilePath(id);
  const st = await stat(file).catch(() => null);
  if (!st?.isFile()) return notFound();

  const inline = new URL(req.url).searchParams.get("inline") === "1" && INLINE.has(f.mime);
  const size = st.size;
  const headers: Record<string, string> = {
    "Content-Type": inline ? f.mime : "application/octet-stream",
    "Content-Disposition": disposition(inline ? "inline" : "attachment", f.name),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    // Foydalanuvchi yuklagan fayl hech qachon sayt nomidan skript ishga tushira olmasin
    "Content-Security-Policy": "sandbox; default-src 'none'; media-src 'self'; img-src 'self'",
  };

  let start = 0;
  let end = size - 1;
  let status = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range")?.trim() ?? "");
  if (m && (m[1] || m[2])) {
    if (m[1]) {
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    } else {
      start = Math.max(0, size - Number(m[2]));
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(end - start + 1);
  const stream = createReadStream(file, { start, end, highWaterMark: 256 * 1024 });
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status, headers });
}
