import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { editorProfiles, payments, users } from "@/db/schema";
import { env } from "@/lib/env";
import { readUpload } from "@/lib/uploads";
import { formatUzs } from "@/lib/utils";

type TgResult<T = unknown> = { ok: boolean; result?: T; description?: string };

export const telegramEnabled = () => Boolean(env.telegram.token && env.telegram.adminChatId);

function apiUrl(method: string) {
  return `https://api.telegram.org/bot${env.telegram.token}/${method}`;
}

export async function tgCall<T = unknown>(method: string, payload: Record<string, unknown>): Promise<TgResult<T> | null> {
  if (!env.telegram.token) return null;
  try {
    const res = await fetch(apiUrl(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as TgResult<T>;
    if (!json.ok) console.error(`[telegram] ${method} failed:`, json.description);
    return json;
  } catch (e) {
    console.error(`[telegram] ${method} error`, e);
    return null;
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

const STATUS_LABEL = { PENDING: "⏳ Tekshirilmoqda", APPROVED: "✅ Tasdiqlandi", REJECTED: "❌ Rad etildi" } as const;

async function loadPayment(paymentId: string) {
  const rows = await db
    .select({ p: payments, email: users.email, userName: users.name, slug: editorProfiles.slug, editorName: editorProfiles.displayName })
    .from(payments)
    .innerJoin(users, eq(users.id, payments.userId))
    .innerJoin(editorProfiles, eq(editorProfiles.id, payments.editorId))
    .where(eq(payments.id, paymentId))
    .limit(1);
  return rows[0] ?? null;
}

function caption(row: NonNullable<Awaited<ReturnType<typeof loadPayment>>>) {
  const { p } = row;
  const lines = [
    `<b>💳 Yangi to'lov — TOP ${escapeHtml(p.planName)}</b>`,
    ``,
    `👤 <b>${escapeHtml(row.editorName)}</b> (${escapeHtml(row.email)})`,
    `🔗 ${escapeHtml(env.appUrl)}/editors/${escapeHtml(row.slug)}`,
    `💰 <b>${formatUzs(p.amountUzs)} so'm</b> · ${p.days} kun · vazn ${p.weight}`,
    `🏦 Karta: ${escapeHtml(p.method)}`,
    p.payerNote ? `📝 ${escapeHtml(p.payerNote)}` : null,
    `🆔 <code>${p.id}</code>`,
    ``,
    `Holat: <b>${STATUS_LABEL[p.status]}</b>${p.reviewedBy ? ` — ${escapeHtml(p.reviewedBy)}` : ""}`,
    p.adminNote ? `Sabab: ${escapeHtml(p.adminNote)}` : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function keyboard(paymentId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Tasdiqlash", callback_data: `pa:${paymentId}` },
        { text: "❌ Rad etish", callback_data: `pr:${paymentId}` },
      ],
    ],
  };
}

/** Yangi to'lov haqida admin chatga chek rasmi bilan xabar yuborish */
export async function notifyNewPayment(paymentId: string) {
  if (!telegramEnabled()) return;
  const row = await loadPayment(paymentId);
  if (!row) return;
  const img = await readUpload(row.p.receiptKey);
  let messageId: number | undefined;
  try {
    if (img) {
      const form = new FormData();
      form.set("chat_id", env.telegram.adminChatId);
      form.set("caption", caption(row));
      form.set("parse_mode", "HTML");
      form.set("reply_markup", JSON.stringify(keyboard(paymentId)));
      form.set("photo", new Blob([new Uint8Array(img)], { type: "image/webp" }), "receipt.webp");
      const res = await fetch(apiUrl("sendPhoto"), { method: "POST", body: form, signal: AbortSignal.timeout(20_000) });
      const json = (await res.json()) as TgResult<{ message_id: number }>;
      if (json.ok) messageId = json.result?.message_id;
      else console.error("[telegram] sendPhoto failed:", json.description);
    }
    if (!messageId) {
      const json = await tgCall<{ message_id: number }>("sendMessage", {
        chat_id: env.telegram.adminChatId,
        text: caption(row),
        parse_mode: "HTML",
        reply_markup: keyboard(paymentId),
      });
      messageId = json?.result?.message_id;
    }
    if (messageId) await db.update(payments).set({ telegramMessageId: messageId }).where(eq(payments.id, paymentId));
  } catch (e) {
    console.error("[telegram] notify failed", e);
  }
}

/** To'lov holati o'zgargach Telegram'dagi xabarni yangilash (tugmalarni olib tashlash) */
export async function refreshPaymentMessage(paymentId: string) {
  if (!telegramEnabled()) return;
  const row = await loadPayment(paymentId);
  if (!row?.p.telegramMessageId) return;
  const base = { chat_id: env.telegram.adminChatId, message_id: row.p.telegramMessageId, parse_mode: "HTML" };
  const r = await tgCall("editMessageCaption", { ...base, caption: caption(row), reply_markup: { inline_keyboard: [] } });
  if (!r?.ok) await tgCall("editMessageText", { ...base, text: caption(row), reply_markup: { inline_keyboard: [] } });
}

export async function sendAdminMessage(text: string) {
  if (!telegramEnabled()) return null;
  return tgCall("sendMessage", { chat_id: env.telegram.adminChatId, text, parse_mode: "HTML" });
}

export async function setTelegramWebhook() {
  return tgCall("setWebhook", {
    url: `${env.appUrl}/api/telegram/webhook`,
    secret_token: env.telegram.webhookSecret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function getTelegramWebhookInfo() {
  return tgCall<{ url: string; pending_update_count: number; last_error_message?: string }>("getWebhookInfo", {});
}
