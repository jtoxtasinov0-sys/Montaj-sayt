import { timingSafeEqual } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { editorProfiles, orders, payments, users } from "@/db/schema";
import { SITE_NAME } from "@/lib/constants";
import { env } from "@/lib/env";
import { approvePayment, expireStalePayments, matchIncoming, parseAmounts, rejectPayment } from "@/lib/payments";
import { afterLinked, linkedText, linkTelegramChat, relayFromTelegram, type TgIncoming, type TgKind } from "@/lib/notify";
import { escapeHtml, tgCall } from "@/lib/telegram";
import { formatUzs } from "@/lib/utils";

type TgUser = { id: number; username?: string; first_name?: string };
type TgFile = { file_id: string; file_size?: number; file_name?: string; mime_type?: string };
type TgMessage = {
  message_id: number;
  chat: { id: number; type?: string };
  from?: TgUser;
  text?: string;
  caption?: string;
  video?: TgFile;
  document?: TgFile;
  photo?: TgFile[];
  audio?: TgFile;
  voice?: TgFile;
  animation?: TgFile;
  video_note?: TgFile;
};
type Update = {
  message?: TgMessage;
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
    const m = update.message;
    if (update.callback_query) await handleCallback(update.callback_query);
    else if (m) {
      const file = extractFile(m);
      const isCommand = (m.text ?? "").trim().startsWith("/");
      // Shaxsiy chatda fayl yoki oddiy matn — buyurtma bo'yicha mijoz ↔ mutaxassis o'rtasida yetkazamiz
      // (adminlarning matnlari — bank xabari bo'lishi mumkin, ular avvalgidek to'lov tekshiruviga ketadi)
      if (m.chat.type === "private" && !isCommand && (file || (m.text && !isAdmin(m.from)))) {
        const reply = await relayFromTelegram(m.chat.id, { messageId: m.message_id, text: m.text, caption: m.caption, file });
        if (reply) await tgCall("sendMessage", { chat_id: m.chat.id, text: reply, reply_to_message_id: m.message_id });
      } else if (m.text || m.caption) {
        await handleMessage({ ...m, text: m.text ?? m.caption });
      }
    }
  } catch (e) {
    console.error("[telegram] webhook error", e);
  }
  return NextResponse.json({ ok: true });
}

/** Xabardagi fayl (video, hujjat, rasm — eng kattasi, audio, ovozli xabar, GIF, dumaloq video) */
function extractFile(m: TgMessage): TgIncoming["file"] {
  const pick = (kind: TgKind, f: TgFile | undefined, fallbackName: string, fallbackMime: string) =>
    f && { kind, fileId: f.file_id, size: f.file_size ?? 0, name: f.file_name || fallbackName, mime: f.mime_type || fallbackMime };
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return (
    pick("video", m.video, `video_${stamp}.mp4`, "video/mp4") ||
    pick("document", m.document, `file_${stamp}`, "application/octet-stream") ||
    pick("photo", m.photo?.at(-1), `photo_${stamp}.jpg`, "image/jpeg") ||
    pick("audio", m.audio, `audio_${stamp}.mp3`, "audio/mpeg") ||
    pick("voice", m.voice, `voice_${stamp}.ogg`, "audio/ogg") ||
    pick("animation", m.animation, `gif_${stamp}.mp4`, "video/mp4") ||
    pick("video_note", m.video_note, `video_note_${stamp}.mp4`, "video/mp4") ||
    undefined
  );
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

async function handleMessage(msg: { chat: { id: number; type?: string }; from?: TgUser; text?: string }) {
  const text = (msg.text ?? "").trim();
  const cmd = text.split(/[\s@]/)[0].toLowerCase();
  const reply = (t: string, extra: Record<string, unknown> = {}) =>
    tgCall("sendMessage", { chat_id: msg.chat.id, text: t, parse_mode: "HTML", ...extra });

  // Foydalanuvchi bildirishnomalarini ulash: kabinetdagi tugma t.me/<bot>?start=u_<kod> ni ochadi
  const payload = text.split(/\s+/)[1] ?? "";
  if (cmd === "/start" && payload.startsWith("u_")) {
    const linked = await linkTelegramChat(payload.slice(2), msg.chat.id);
    await reply(linked ? linkedText(linked.locale) : "⚠️ Havola eskirgan. Saytdagi «Telegram botni ulash» tugmasini qayta bosing.");
    // Buyurtma sahifasidan kelgan bo'lsa: shu buyurtma tanlanadi va ikkinchi tomonning kutib turgan fayllari yetkaziladi
    if (linked) await afterLinked(linked);
    return;
  }

  if (cmd === "/start" || cmd === "/id") {
    // Oddiy foydalanuvchi (admin emas, adminlar allaqachon sozlangan) — faqat bildirishnomalar haqida
    if (env.telegram.adminIds.length && !isAdmin(msg.from)) {
      await reply(
        [
          `<b>${escapeHtml(SITE_NAME)}</b>`,
          "Bu bot yangi buyurtma, xabar va fayllar haqida xabar beradi. Ulash uchun saytda: Kabinet → Sozlamalar → «Telegram botni ulash».",
          `${escapeHtml(env.appUrl)}/dashboard/settings`,
        ].join("\n"),
      );
      return;
    }
    await reply(
      [
        `<b>${escapeHtml(SITE_NAME)} admin bot</b>`,
        `Chat ID: <code>${msg.chat.id}</code>`,
        msg.from ? `Sizning ID: <code>${msg.from.id}</code>` : "",
        "",
        "Buyruqlar: /stats — statistika, /pending — kutilayotgan to'lovlar",
        "Bank xabarini (kartaga pul tushgani haqida) shu yerga forward qiling — summa mos kelsa, TOP avtomatik yoqiladi.",
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

  // Buyruq emas — bank xabari bo'lishi mumkin: summani kutilayotgan to'lovlarga moslaymiz
  if (!cmd.startsWith("/")) {
    await expireStalePayments();
    const amounts = parseAmounts(text);
    if (!amounts.length) return;
    const matched = await matchIncoming(amounts, "telegram", text);
    await reply(
      matched.length
        ? matched.map((m) => `✅ ${escapeHtml(m.editor)} — ${formatUzs(m.amount)} so'm. TOP yoqildi.`).join("\n")
        : `🔎 Mos kutilayotgan to'lov topilmadi (${amounts.map((a) => formatUzs(a)).join(", ")} so'm). /pending — ro'yxat`,
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
