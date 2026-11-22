"use server";

import { statfs } from "node:fs/promises";
import { and, eq, sql } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { orderFiles, orderMessages, orders, users } from "@/db/schema";
import type { ActionState } from "@/lib/action-types";
import { CHAT, ORDER_FILES } from "@/lib/constants";
import { maskContacts } from "@/lib/contacts";
import { getContactsHidden } from "@/lib/data";
import { env } from "@/lib/env";
import { fmt, getLocale } from "@/lib/i18n";
import { getBotUsername, notifyOrder, resendFileToUser, selectOrderInBot, telegramLinkUrl } from "@/lib/notify";
import { canUpload, canWrite, orderAccess, removeOrderFileFromDisk } from "@/lib/order-room";
import { formatBytes } from "@/lib/utils";
import { fail, guarded, ok } from "./_helpers";

const uuid = z.uuid();

/** Loyiha xonasiga xabar. Kontaktlar (telefon, @username, t.me) yashiriladi — admin sozlamasi bo'yicha */
export async function sendRoomMessage(orderId: string, text: string): Promise<ActionState> {
  return guarded({ key: "room-msg", limit: 40 }, async ({ user, d }) => {
    if (!uuid.safeParse(orderId).success) return fail(d.errors.notFound);
    const body = String(text ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
    if (!body || body.length > CHAT.maxLength) return fail(d.errors.validation);
    const acc = await orderAccess(orderId, user);
    if (!acc || (acc.role !== "client" && acc.role !== "editor")) return fail(d.errors.notFound);
    if (!canWrite(acc.order)) return fail(d.errors.chatClosed);

    const { text: safe, masked } = (await getContactsHidden()) ? maskContacts(body) : { text: body, masked: false };
    const now = new Date();
    await db.insert(orderMessages).values({ orderId, authorId: user.id, body: safe, masked, createdAt: now });
    await db
      .update(orders)
      .set(acc.role === "client" ? { lastMessageAt: now, clientReadAt: now } : { lastMessageAt: now, editorReadAt: now })
      .where(eq(orders.id, orderId));
    after(() => notifyOrder(orderId, "message", user.id, `${user.name}: ${safe}`));
    return ok("");
  });
}

export type StartFileResult = { ok: true; id: string } | { ok: false; message: string };

/**
 * Fayl yuklashni boshlash (Telegramsiz material almashish). Limitlar tekshiriladi va "uploading" yozuvi yaratiladi;
 * faylning o'zi keyin bo'laklab PUT /api/order-files/<id> ga yuboriladi. Mijoz — "material", mutaxassis — "result".
 */
export async function startOrderFileUpload(orderId: string, meta: { name: string; size: number; mime: string }): Promise<StartFileResult> {
  let id: string | null = null;
  const res = await guarded({ key: "room-file", limit: 30 }, async ({ user, d }) => {
    if (!uuid.safeParse(orderId).success) return fail(d.errors.notFound);
    const acc = await orderAccess(orderId, user);
    if (!acc || (acc.role !== "client" && acc.role !== "editor")) return fail(d.errors.notFound);
    if (!canUpload(acc.order)) return fail(d.errors.filesClosed);

    const size = Number(meta?.size);
    if (!Number.isSafeInteger(size) || size <= 0) return fail(d.errors.validation);
    if (size > ORDER_FILES.maxFileBytes) return fail(fmt(d.errors.fileTooBig, { max: formatBytes(ORDER_FILES.maxFileBytes) }));
    // Asl nom faqat ko'rsatish uchun: boshqaruv belgilari va yo'l qismlari olib tashlanadi
    const name =
      String(meta?.name ?? "")
        .replace(/[\u0000-\u001f\u007f/\\]+/g, "_")
        .trim()
        .slice(-150) || "file";
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(String(meta?.mime ?? "")) ? String(meta.mime).slice(0, 100) : "application/octet-stream";

    // Disk to'lib qolsa butun sayt (baza ham) to'xtaydi — joy kam bo'lsa yangi yuklashni qabul qilmaymiz
    try {
      const fs = await statfs(env.uploadDir);
      if (fs.bavail * fs.bsize < size * 1.2 + 3 * 1024 ** 3) return fail(d.errors.videoDisk);
    } catch {}

    const created = await db.transaction(async (tx) => {
      // Bir vaqtda ikki tabdan yuklasa ham limit oshmasligi uchun buyurtma qatorini qulflaymiz
      await tx.execute(sql`select 1 from ${orders} where ${orders.id} = ${orderId} for update`);
      const [u] = await tx
        .select({
          bytes: sql<number>`coalesce(sum(${orderFiles.size}), 0)::float8`,
          count: sql<number>`count(*)::int`,
        })
        .from(orderFiles)
        .where(and(eq(orderFiles.orderId, orderId), sql`${orderFiles.status} <> 'deleted'`, eq(orderFiles.storage, "disk")));
      if (u.count >= ORDER_FILES.maxFiles) return "count" as const;
      if (Number(u.bytes) + size > ORDER_FILES.maxOrderBytes) return "quota" as const;
      const [row] = await tx
        .insert(orderFiles)
        .values({ orderId, uploaderId: user.id, name, size, mime, purpose: acc.role === "editor" ? "result" : "material" })
        .returning({ id: orderFiles.id });
      return row;
    });
    if (created === "count") return fail(fmt(d.errors.fileCount, { max: ORDER_FILES.maxFiles }));
    if (created === "quota") return fail(fmt(d.errors.orderQuota, { max: formatBytes(ORDER_FILES.maxOrderBytes) }));
    id = created.id;
    return ok("");
  });
  return id ? { ok: true, id } : { ok: false, message: res?.message ?? "" };
}

/** O'zi yuklagan faylni o'chirish (yoki tugallanmagan yuklashni bekor qilish) */
export async function deleteOrderFile(fileId: string): Promise<ActionState> {
  return guarded({ key: "room-file-del", limit: 40 }, async ({ user, d }) => {
    if (!uuid.safeParse(fileId).success) return fail(d.errors.notFound);
    const [f] = await db
      .update(orderFiles)
      .set({ status: "deleted", deletedAt: new Date() })
      .where(and(eq(orderFiles.id, fileId), eq(orderFiles.uploaderId, user.id), sql`${orderFiles.status} <> 'deleted'`))
      .returning({ id: orderFiles.id, status: orderFiles.status });
    if (!f) return fail(d.errors.notFound);
    await removeOrderFileFromDisk(fileId);
    return ok("");
  });
}

// ---------------- Telegram bildirishnomalari ----------------
export type TgLinkResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Botni ochish. orderId berilsa — "Telegram orqali yuborish": botga tashlangan fayl/xabar shu buyurtmaga boradi
 * (bot ulanmagan bo'lsa — avval ulanadi, keyin shu buyurtma tanlangan bo'ladi).
 */
export async function connectTelegram(orderId?: string): Promise<TgLinkResult> {
  let url: string | null = null;
  const res = await guarded({ key: "tg-link", limit: 20 }, async ({ user, d }) => {
    const locale = await getLocale();
    if (orderId) {
      if (!uuid.safeParse(orderId).success) return fail(d.errors.notFound);
      const acc = await orderAccess(orderId, user);
      if (!acc || (acc.role !== "client" && acc.role !== "editor")) return fail(d.errors.notFound);
      if (!canWrite(acc.order)) return fail(d.errors.chatClosed);
      url = await selectOrderInBot(user, orderId, locale);
    } else url = await telegramLinkUrl(user.id, locale);
    return url ? ok("") : fail(d.notify.off);
  });
  return url ? { ok: true, url } : { ok: false, message: res?.message ?? "" };
}

/** Telegram orqali yuborilgan faylni o'zining bot chatiga qayta olish ("Telegramga olish") */
export async function telegramResend(fileId: string): Promise<TgLinkResult> {
  let url: string | null = null;
  const res = await guarded({ key: "tg-resend", limit: 30 }, async ({ user, d }) => {
    if (!uuid.safeParse(fileId).success) return fail(d.errors.notFound);
    const [f] = await db.select({ orderId: orderFiles.orderId }).from(orderFiles).where(eq(orderFiles.id, fileId)).limit(1);
    if (!f) return fail(d.errors.notFound);
    const r = await resendFileToUser(user, fileId);
    if (r === "not_found") return fail(d.errors.notFound);
    // Bot hali ulanmagan — ulash havolasi (ulangach shu buyurtmaning fayllari o'zi keladi)
    if (r === "not_linked") url = await telegramLinkUrl(user.id, await getLocale(), f.orderId);
    else if (r === "ok") url = `https://t.me/${await getBotUsername()}`;
    return url ? ok("") : fail(d.errors.generic);
  });
  return url ? { ok: true, url } : { ok: false, message: res?.message ?? "" };
}

export async function disconnectTelegram(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "tg-unlink", limit: 10 }, async ({ user, d }) => {
    await db.update(users).set({ tgChatId: null, tgLinkCode: null }).where(eq(users.id, user.id));
    return ok(d.notify.disconnected);
  });
}
