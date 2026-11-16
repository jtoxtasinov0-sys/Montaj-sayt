import { timingSafeEqual } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { editorProfiles, orders, payments, users } from "@/db/schema";
import { env } from "@/lib/env";
import { approvePayment, rejectPayment } from "@/lib/payments";
import { escapeHtml, tgCall } from "@/lib/telegram";
import { formatUzs } from "@/lib/utils";

type TgUser = { id: number; username?: string; first_name?: string };
type Update = {
  message?: { chat: { id: number }; from?: TgUser; text?: string };
  callback_query?: { id: string; from: TgUser; data?: string; message?: { chat: { id: number } } };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function validSecret(given: string | null) {
  const expected = env.telegram.webhookSecret;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const isAdmin = (u?: TgUser) => !!u && env.telegram.adminIds.includes(String(u.id));
const label = (u: TgUser) => `telegram:${u.username ? "@" + u.username : u.id}`;

export async function POST(req: Request) {
  // Faqat Telegram'dan kelgan so'rovlar (setWebhook'dagi secret_token)
  if (!validSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const update = (await req.json().catch(() => null)) as Update | null;
  if (!update) return NextResponse.json({ ok: true });

  try {
    if (update.callback_query) await handleCallback(update.callback_query);
    else if (update.message?.text) await handleMessage(update.message as Required<Update>["message"]);
  } catch (e) {
    console.error("[telegram] webhook error", e);
  }
  return NextResponse.json({ ok: true });
}

async function handleCallback(cq: NonNullable<Update["callback_query"]>) {
  if (!isAdmin(cq.from)) {
    await tgCall("answerCallbackQuery", { callback_query_id: cq.id, text: "⛔ Ruxsat yo'q", show_alert: true });
    return;
  }
  const [action, id] = (cq.data ?? "").split(":");
  if (!UUID.test(id ?? "")) return;
  const by = { label: label(cq.from) };
  const res = action === "pa" ? await approvePayment(id, by) : action === "pr" ? await rejectPayment(id, by, "Telegram orqali rad etildi") : null;
  if (!res) return;
  await tgCall("answerCallbackQuery", {
    callback_query_id: cq.id,
    text: res.ok ? (action === "pa" ? "✅ Tasdiqlandi — TOP faollashdi" : "❌ Rad etildi") : "Bu to'lov allaqachon ko'rib chiqilgan",
  });
}

async function handleMessage(msg: { chat: { id: number }; from?: TgUser; text?: string }) {
  const text = (msg.text ?? "").trim();
  const cmd = text.split(/[\s@]/)[0].toLowerCase();
  const reply = (t: string, extra: Record<string, unknown> = {}) =>
    tgCall("sendMessage", { chat_id: msg.chat.id, text: t, parse_mode: "HTML", ...extra });

  if (cmd === "/start" || cmd === "/id") {
    await reply(
      [
        "<b>MontajHub admin bot</b>",
        `Chat ID: <code>${msg.chat.id}</code>`,
        msg.from ? `Sizning ID: <code>${msg.from.id}</code>` : "",
        "",
        "Buyruqlar: /stats — statistika, /pending — kutilayotgan to'lovlar",
      ].join("\n"),
    );
    return;
  }
  if (!isAdmin(msg.from)) return;

  if (cmd === "/stats") {
    const [[u], [e], [o], [p]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(users),
      db.select({ n: sql<number>`count(*)::int` }).from(editorProfiles),
      db
        .select({
          open: sql<number>`count(*) filter (where ${orders.status} = 'OPEN')::int`,
          active: sql<number>`count(*) filter (where ${orders.status} in ('IN_PROGRESS','DELIVERED'))::int`,
          done: sql<number>`count(*) filter (where ${orders.status} = 'COMPLETED')::int`,
        })
        .from(orders),
      db
        .select({
          pending: sql<number>`count(*) filter (where ${payments.status} = 'PENDING')::int`,
          month: sql<number>`coalesce(sum(${payments.amountUzs}) filter (where ${payments.status} = 'APPROVED' and ${payments.createdAt} > date_trunc('month', now())), 0)::int`,
        })
        .from(payments),
    ]);
    await reply(
      [
        "<b>📊 Statistika</b>",
        `👥 Foydalanuvchilar: ${u.n}`,
        `🎬 Montajorlar: ${e.n}`,
        `📂 Ochiq buyurtmalar: ${o.open} · Jarayonda: ${o.active} · Yakunlangan: ${o.done}`,
        `💳 Kutilayotgan to'lovlar: ${p.pending}`,
        `💰 Shu oy tushum: ${formatUzs(p.month)} so'm`,
      ].join("\n"),
    );
    return;
  }

  if (cmd === "/pending") {
    const rows = await db
      .select({ id: payments.id, plan: payments.planName, amount: payments.amountUzs, name: editorProfiles.displayName })
      .from(payments)
      .innerJoin(editorProfiles, eq(editorProfiles.id, payments.editorId))
      .where(eq(payments.status, "PENDING"))
      .orderBy(desc(payments.createdAt))
      .limit(10);
    if (!rows.length) {
      await reply("✅ Kutilayotgan to'lovlar yo'q");
      return;
    }
    for (const r of rows) {
      await reply(`<b>${escapeHtml(r.name)}</b> — ${escapeHtml(r.plan)}, ${formatUzs(r.amount)} so'm\n<code>${r.id}</code>`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Tasdiqlash", callback_data: `pa:${r.id}` },
              { text: "❌ Rad etish", callback_data: `pr:${r.id}` },
            ],
          ],
        },
      });
    }
  }
}
