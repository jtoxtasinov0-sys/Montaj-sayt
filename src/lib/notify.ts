import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { editorProfiles, orderFiles, orderMessages, orders, users } from "@/db/schema";
import { cached } from "@/lib/cache";
import { maskContacts } from "@/lib/contacts";
import { getContactsHidden } from "@/lib/data";
import { canUpload, canWrite, orderAccess } from "@/lib/order-room";
import { env } from "@/lib/env";
import { escapeHtml, tgCall } from "@/lib/telegram";

/**
 * Foydalanuvchilarga Telegram bildirishnomalari. Bot faqat "qo'ng'iroq" vazifasida: "yangi xabar / fayl / buyurtma"
 * deb yozadi va "Saytda ochish" tugmasini beradi. Javob saytda yoziladi — yozishma va fayllar bitta joyda qoladi,
 * mijoz va mutaxassis bir-birining Telegramini ko'rmaydi.
 *
 * Ulash: kabinetda "Telegram botni ulash" → t.me/<bot>?start=u_<kod> → botda Start → webhook kodni topib,
 * chat ID ni foydalanuvchiga yozadi (src/app/api/telegram/webhook/route.ts).
 */

export const userNotifyEnabled = () => Boolean(env.telegram.token && env.telegram.webhookSecret);

/** Bot username (t.me havolasi uchun): TELEGRAM_BOT_USERNAME yoki getMe orqali (1 soat keshda) */
export function getBotUsername() {
  if (process.env.TELEGRAM_BOT_USERNAME) return Promise.resolve(process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, ""));
  if (!env.telegram.token) return Promise.resolve(null);
  return cached("tg:me", 3_600_000, async () => {
    const r = await tgCall<{ username?: string }>("getMe", {});
    return r?.result?.username ?? null;
  });
}

/**
 * Bir martalik ulash havolasi. Kod foydalanuvchiga yoziladi; bot /start u_<kod> ni olganda chat ID ni saqlaydi.
 * orderId berilsa — botga yuborilgan fayl/xabar shu buyurtmaga boradi.
 */
export async function telegramLinkUrl(userId: string, locale: string, orderId?: string) {
  const bot = await getBotUsername();
  if (!bot) return null;
  const code = randomBytes(12).toString("hex");
  await db
    .update(users)
    .set({ tgLinkCode: code, locale, ...(orderId && { tgOrderId: orderId }) })
    .where(eq(users.id, userId));
  return `https://t.me/${bot}?start=u_${code}`;
}

/** Webhook: /start u_<kod> — kodni topib, chatni foydalanuvchiga bog'laydi */
export async function linkTelegramChat(code: string, chatId: number) {
  if (!/^[a-f0-9]{24}$/.test(code)) return null;
  // Bitta Telegram chat — bitta akkaunt: avval shu chatga bog'langan boshqa akkauntdan ajratamiz
  await db.update(users).set({ tgChatId: null }).where(eq(users.tgChatId, chatId));
  const [u] = await db
    .update(users)
    .set({ tgChatId: chatId, tgLinkCode: null })
    .where(eq(users.tgLinkCode, code))
    .returning({ id: users.id, name: users.name, locale: users.locale, tgOrderId: users.tgOrderId, tgChatId: users.tgChatId });
  return u ?? null;
}

type Lang = "uz" | "ru" | "en";
const T: Record<string, Record<Lang, string>> = {
  linked: {
    uz: "✅ Ulandi! Endi yangi buyurtma, xabar va fayllar haqida shu yerga xabar keladi. Javobni saytda yozasiz.",
    ru: "✅ Подключено! Теперь сюда будут приходить уведомления о заказах, сообщениях и файлах. Отвечать — на сайте.",
    en: "✅ Connected! You’ll get notifications about orders, messages and files here. Reply on the site.",
  },
  open: { uz: "Saytda ochish", ru: "Открыть на сайте", en: "Open on the site" },
  message: { uz: "💬 Yangi xabar", ru: "💬 Новое сообщение", en: "💬 New message" },
  file: { uz: "📎 Yangi fayl", ru: "📎 Новый файл", en: "📎 New file" },
  order_new: { uz: "🆕 Sizga yangi buyurtma", ru: "🆕 Вам новый заказ", en: "🆕 You have a new order" },
  proposal: { uz: "📨 Buyurtmangizga yangi taklif", ru: "📨 Новое предложение на ваш заказ", en: "📨 New proposal for your order" },
  accepted: { uz: "✅ Buyurtma qabul qilindi — ish boshlandi", ru: "✅ Заказ принят — работа началась", en: "✅ Order accepted — work has started" },
  chosen: { uz: "🎉 Taklifingiz tanlandi — ish boshlandi", ru: "🎉 Ваше предложение выбрали — работа началась", en: "🎉 Your proposal was chosen — work has started" },
  delivered: { uz: "📦 Ish topshirildi — tekshiring", ru: "📦 Работа сдана — проверьте", en: "📦 Work delivered — please review" },
  revision: { uz: "🔁 Mijoz qayta ishlashni so’radi", ru: "🔁 Клиент попросил доработку", en: "🔁 The client asked for a revision" },
  completed: { uz: "🏁 Buyurtma yakunlandi", ru: "🏁 Заказ завершён", en: "🏁 Order completed" },
  declined: { uz: "❌ Mutaxassis buyurtmani rad etdi", ru: "❌ Специалист отклонил заказ", en: "❌ The specialist declined the order" },
  cancelled: { uz: "❌ Buyurtma bekor qilindi", ru: "❌ Заказ отменён", en: "❌ The order was cancelled" },
  // ---- botga fayl/xabar tashlash (Telegram orqali material almashish) ----
  selected: {
    uz: "📂 «{title}» buyurtmasi tanlandi.\nVideo, rasm, hujjat (2 GB gacha) yoki xabarni shu yerga tashlang — {other}ga o’zim yetkazaman. Bir-biringizning Telegramingiz ko’rinmaydi.",
    ru: "📂 Выбран заказ «{title}».\nОтправляйте сюда видео, фото, документы (до 2 ГБ) или сообщения — я передам их: {other}. Telegram друг друга вы не видите.",
    en: "📂 Order “{title}” selected.\nSend videos, photos, documents (up to 2 GB) or messages here — I’ll pass them to the {other}. You don’t see each other’s Telegram.",
  },
  toClient: { uz: "mijoz", ru: "клиенту", en: "client" },
  toSpecialist: { uz: "mutaxassis", ru: "специалисту", en: "specialist" },
  fromClient: { uz: "mijozdan", ru: "от клиента", en: "from the client" },
  fromSpecialist: { uz: "mutaxassisdan", ru: "от специалиста", en: "from the specialist" },
  noOrder: {
    uz: "Qaysi buyurtmaga yuborishni bilmayman. Saytda buyurtmani oching va «Telegram orqali yuborish» tugmasini bosing.",
    ru: "Не знаю, к какому заказу это отправить. Откройте заказ на сайте и нажмите «Отправить через Telegram».",
    en: "I don’t know which order this is for. Open the order on the site and press “Send via Telegram”.",
  },
  closed: {
    uz: "«{title}» buyurtmasi yopilgan — endi bu yerga yuborib bo’lmaydi.",
    ru: "Заказ «{title}» закрыт — отправлять в него больше нельзя.",
    en: "Order “{title}” is closed — you can’t send to it anymore.",
  },
  sentFile: { uz: "✅ «{title}»ga yuborildi: {name}", ru: "✅ Отправлено в «{title}»: {name}", en: "✅ Sent to “{title}”: {name}" },
  waitingOther: {
    uz: "Ikkinchi tomon hali botni ulamagan — fayl saytdagi loyiha xonasida turibdi, ulanishi bilan unga yetkazaman.",
    ru: "Другая сторона ещё не подключила бота — файл ждёт в комнате проекта на сайте и будет передан, как только она подключится.",
    en: "The other side hasn’t connected the bot yet — the file waits in the project room and will be delivered once they connect.",
  },
  replyHint: { uz: "Javob yozsangiz — shu buyurtmaga boradi.", ru: "Ваш ответ уйдёт в этот заказ.", en: "Your reply goes to this order." },
  unsupported: {
    uz: "Bu turdagi xabarni yuborib bo’lmaydi. Video, rasm, hujjat, audio yoki matn yuboring.",
    ru: "Такой тип сообщения не поддерживается. Отправьте видео, фото, документ, аудио или текст.",
    en: "This message type isn’t supported. Send a video, photo, document, audio or text.",
  },
  maskedNote: { uz: "🔒 Kontakt yashirildi", ru: "🔒 Контакт скрыт", en: "🔒 Contact hidden" },
};
const lang = (l: string | null | undefined): Lang => (l === "ru" || l === "en" ? l : "uz");
export const linkedText = (locale: string | null | undefined) => T.linked[lang(locale)];
const tr = (key: keyof typeof T, l: Lang, vars: Record<string, string> = {}) =>
  T[key][l].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");

/** Bitta foydalanuvchiga xabar. Bot bloklangan bo'lsa — chat ID tozalanadi */
async function sendTo(user: { id: string; tgChatId: number | null; locale: string }, title: string, body: string | null, path: string) {
  if (!user.tgChatId || !env.telegram.token) return;
  // Botda javob yozsa (yoki fayl tashlasa) — shu buyurtmaga borsin
  const orderId = /^\/orders\/([0-9a-f-]{36})/.exec(path)?.[1];
  if (orderId) await db.update(users).set({ tgOrderId: orderId }).where(eq(users.id, user.id));
  const url = `${env.appUrl}${path}`;
  const l = lang(user.locale);
  const text = [`<b>${escapeHtml(title)}</b>`, body ? escapeHtml(body) : null, orderId ? `<i>${escapeHtml(T.replyHint[l])}</i>` : null, env.appUrl.startsWith("https://") ? null : url]
    .filter(Boolean)
    .join("\n");
  const r = await tgCall("sendMessage", {
    chat_id: user.tgChatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    // Telegram tugmalari faqat https havolani qabul qiladi
    ...(env.appUrl.startsWith("https://") && { reply_markup: { inline_keyboard: [[{ text: T.open[l], url }]] } }),
  });
  if (r && !r.ok && /blocked|deactivated|chat not found/i.test(r.description ?? "")) {
    await db.update(users).set({ tgChatId: null }).where(eq(users.id, user.id));
  }
}

export type OrderEvent = "message" | "file" | "order_new" | "proposal" | "accepted" | "chosen" | "delivered" | "revision" | "completed" | "declined" | "cancelled";

/**
 * Buyurtma hodisasi haqida ikkinchi tomonga xabar (hodisani qilgan odamning o'ziga yuborilmaydi).
 * Saytdagi chat xabari to'liq (kontaktlari yashirilgan holda) yuboriladi — botda javob yozsa, saytdagi chatga qaytadi.
 */
export async function notifyOrder(orderId: string, event: OrderEvent, actorId: string | null, preview?: string) {
  if (!env.telegram.token) return;
  try {
    const [row] = await db
      .select({ title: orders.title, clientId: orders.clientId, editorUserId: editorProfiles.userId })
      .from(orders)
      .leftJoin(editorProfiles, eq(editorProfiles.id, orders.editorId))
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!row) return;
    const targets = [row.clientId, row.editorUserId].filter((id): id is string => !!id && id !== actorId);
    for (const id of targets) {
      const [u] = await db
        .select({ id: users.id, tgChatId: users.tgChatId, locale: users.locale, lastSeenAt: users.lastSeenAt })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!u?.tgChatId) continue;
      const l = lang(u.locale);
      const body = [`«${row.title}»`, preview ? preview.slice(0, 3500) : null].filter(Boolean).join("\n");
      await sendTo(u, T[event][l], body, `/orders/${orderId}`);
    }
  } catch (e) {
    console.error("[notify] failed", e);
  }
}

// ======================================================================
// Telegram orqali material almashish: foydalanuvchi botga fayl yoki xabar tashlaydi → bot uni saytdagi loyiha xonasiga
// yozadi va ikkinchi tomonga O'Z NOMIDAN yetkazadi (asl yuboruvchi ko'rinmaydi). Fayl Telegram serverida qoladi —
// biz faqat file_id ni saqlaymiz, diskimiz egallanmaydi. Bot fayllarni file_id orqali qayta yuborganda hajm cheklovi yo'q
// (foydalanuvchi botga 2 GB gacha, Premium bilan 4 GB gacha yubora oladi).
// ======================================================================

export type TgIncoming = {
  messageId: number;
  text?: string;
  caption?: string;
  file?: { kind: TgKind; fileId: string; size: number; name: string; mime: string };
};
export type TgKind = "video" | "document" | "photo" | "audio" | "voice" | "animation" | "video_note";

const SEND_METHOD: Record<TgKind, [string, string]> = {
  video: ["sendVideo", "video"],
  document: ["sendDocument", "document"],
  photo: ["sendPhoto", "photo"],
  audio: ["sendAudio", "audio"],
  voice: ["sendVoice", "voice"],
  animation: ["sendAnimation", "animation"],
  video_note: ["sendVideoNote", "video_note"],
};

const openButton = (orderId: string, l: Lang) =>
  env.appUrl.startsWith("https://") ? { reply_markup: { inline_keyboard: [[{ text: T.open[l], url: `${env.appUrl}/orders/${orderId}` }]] } } : {};

/** Faylni file_id bo'yicha chatga yuborish (bot o'z nomidan; asl yuboruvchi ko'rinmaydi) */
async function sendTgFile(chatId: number, kind: TgKind, fileId: string, caption: string, extra: Record<string, unknown> = {}) {
  const [method, field] = SEND_METHOD[kind] ?? SEND_METHOD.document;
  // video_note va voice'da caption yo'q/cheklangan — izohni alohida xabar qilib yuboramiz
  const noCaption = kind === "video_note";
  const r = await tgCall(method, { chat_id: chatId, [field]: fileId, ...(noCaption ? {} : { caption, parse_mode: "HTML" }), ...extra });
  if (noCaption && r?.ok) await tgCall("sendMessage", { chat_id: chatId, text: caption, parse_mode: "HTML", ...extra });
  return r;
}

async function loadParty(userId: string) {
  const [u] = await db
    .select({ id: users.id, name: users.name, role: users.role, tgChatId: users.tgChatId, locale: users.locale, tgOrderId: users.tgOrderId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u ?? null;
}

/** Buyurtma va ikkinchi tomon (mijoz ↔ mutaxassis) */
async function counterpart(orderId: string, me: { id: string; role: string }) {
  const acc = await orderAccess(orderId, me);
  if (!acc || (acc.role !== "client" && acc.role !== "editor")) return null;
  const otherId = acc.role === "client" ? acc.editorUserId : acc.order.clientId;
  const other = otherId ? await loadParty(otherId) : null;
  return { acc, other };
}

/**
 * Buyurtma sahifasidagi "Telegram orqali yuborish": bot konteksti shu buyurtmaga o'tadi va botda ko'rsatma chiqadi.
 * Bot ulanmagan bo'lsa — ulash havolasi (u ulangach shu buyurtma tanlangan bo'ladi).
 */
export async function selectOrderInBot(user: { id: string; role: string }, orderId: string, locale: string) {
  const bot = await getBotUsername();
  if (!bot) return null;
  const me = await loadParty(user.id);
  if (!me?.tgChatId) return telegramLinkUrl(user.id, locale, orderId);
  await db.update(users).set({ tgOrderId: orderId, locale }).where(eq(users.id, user.id));
  await sendSelected(me.tgChatId, user, orderId, lang(locale));
  return `https://t.me/${bot}`;
}

async function sendSelected(chatId: number, user: { id: string; role: string }, orderId: string, l: Lang) {
  const cp = await counterpart(orderId, user);
  if (!cp) return;
  await tgCall("sendMessage", {
    chat_id: chatId,
    text: tr("selected", l, { title: escapeHtml(cp.acc.order.title), other: T[cp.acc.role === "client" ? "toSpecialist" : "toClient"][l] }),
    parse_mode: "HTML",
    ...openButton(orderId, l),
  });
}

/**
 * Bot ulangandan keyin (buyurtma sahifasidan kelgan bo'lsa): ko'rsatma + ikkinchi tomon Telegram orqali yuborgan,
 * lekin bu odam hali ulanmagani uchun yetib bormagan fayllarni yetkazamiz.
 */
export async function afterLinked(u: { id: string; tgChatId: number | null; tgOrderId: string | null; locale: string }) {
  if (!u.tgChatId || !u.tgOrderId) return;
  const me = await loadParty(u.id);
  if (!me) return;
  const l = lang(u.locale);
  await sendSelected(u.tgChatId, me, u.tgOrderId, l);
  const cp = await counterpart(u.tgOrderId, me);
  if (!cp) return;
  const files = await db
    .select()
    .from(orderFiles)
    .where(
      and(eq(orderFiles.orderId, u.tgOrderId), eq(orderFiles.storage, "telegram"), eq(orderFiles.status, "ready"), ne(orderFiles.uploaderId, u.id)),
    )
    .orderBy(asc(orderFiles.createdAt))
    .limit(30);
  for (const f of files) await deliverFile(u.tgChatId, f, cp.acc.order.title, cp.acc.role === "client" ? "fromSpecialist" : "fromClient", l, u.tgOrderId);
}

type FileRow = typeof orderFiles.$inferSelect;
async function deliverFile(chatId: number, f: FileRow, title: string, from: "fromClient" | "fromSpecialist", l: Lang, orderId: string, note = "") {
  if (!f.tgFileId) return null;
  const caption = [`📎 <b>«${escapeHtml(title)}»</b> — ${T[from][l]}`, escapeHtml(f.name), note, `<i>${escapeHtml(T.replyHint[l])}</i>`]
    .filter(Boolean)
    .join("\n");
  return sendTgFile(chatId, (f.tgKind as TgKind) ?? "document", f.tgFileId, caption.slice(0, 1000), openButton(orderId, l));
}

/** Saytdagi "Telegramga olish": Telegram orqali yuborilgan faylni so'ragan odamning bot chatiga qayta yuborish */
export async function resendFileToUser(user: { id: string; role: string }, fileId: string) {
  const [f] = await db.select().from(orderFiles).where(eq(orderFiles.id, fileId)).limit(1);
  if (!f || f.storage !== "telegram" || f.status !== "ready") return "not_found" as const;
  const acc = await orderAccess(f.orderId, user);
  if (!acc?.role) return "not_found" as const;
  const me = await loadParty(user.id);
  if (!me?.tgChatId) return "not_linked" as const;
  const from = f.uploaderId === acc.order.clientId ? "fromClient" : "fromSpecialist";
  const r = await deliverFile(me.tgChatId, f, acc.order.title, from, lang(me.locale), f.orderId);
  return r?.ok ? ("ok" as const) : ("failed" as const);
}

/**
 * Webhook: foydalanuvchi botga fayl yoki matn yubordi. Qaytaradi: botning javobi (yoki null — javob kerak emas).
 */
export async function relayFromTelegram(chatId: number, m: TgIncoming): Promise<string | null> {
  const [me] = await db
    .select({ id: users.id, name: users.name, role: users.role, status: users.status, locale: users.locale, tgOrderId: users.tgOrderId })
    .from(users)
    .where(eq(users.tgChatId, chatId))
    .limit(1);
  if (!me) return "Botni ulash: saytda Kabinet → Sozlamalar → «Telegram botni ulash».\nПодключение: на сайте Кабинет → Настройки → «Подключить Telegram-бот».";
  if (me.status !== "ACTIVE") return null;
  const l = lang(me.locale);
  if (!m.file && !m.text) return T.unsupported[l];
  if (!me.tgOrderId) return T.noOrder[l];
  const cp = await counterpart(me.tgOrderId, me);
  if (!cp) return T.noOrder[l];
  const { acc, other } = cp;
  const orderId = acc.order.id;
  const title = acc.order.title;
  if (m.file ? !canUpload(acc.order) : !canWrite(acc.order)) return tr("closed", l, { title });

  const hidden = await getContactsHidden();
  const rawText = (m.file ? m.caption : m.text)?.trim() ?? "";
  const { text: safe, masked } = hidden && rawText ? maskContacts(rawText) : { text: rawText, masked: false };
  const now = new Date();
  const from = acc.role === "client" ? "fromClient" : "fromSpecialist";
  const ol = lang(other?.locale);

  if (m.file) {
    const name = (m.file.name || `${m.file.kind}`).replace(/[\u0000-\u001f\u007f/\\]+/g, "_").slice(-150);
    const [f] = await db
      .insert(orderFiles)
      .values({
        orderId,
        uploaderId: me.id,
        name,
        size: m.file.size,
        mime: m.file.mime,
        purpose: acc.role === "editor" ? "result" : "material",
        status: "ready",
        storage: "telegram",
        tgFileId: m.file.fileId,
        tgKind: m.file.kind,
        readyAt: now,
      })
      .returning();
    await db.insert(orderMessages).values({ orderId, authorId: me.id, fileId: f.id, createdAt: now });
    if (safe) await db.insert(orderMessages).values({ orderId, authorId: me.id, body: safe, masked, createdAt: new Date(now.getTime() + 1) });
    await db.update(orders).set({ lastMessageAt: now }).where(eq(orders.id, orderId));
    let delivered = false;
    if (other?.tgChatId) {
      const note = [safe ? escapeHtml(safe) : "", masked ? T.maskedNote[ol] : ""].filter(Boolean).join("\n");
      delivered = !!(await deliverFile(other.tgChatId, f, title, from, ol, orderId, note))?.ok;
      if (delivered) await db.update(users).set({ tgOrderId: orderId }).where(eq(users.id, other.id));
    }
    return [tr("sentFile", l, { title, name }), delivered ? null : T.waitingOther[l], masked ? T.maskedNote[l] : null].filter(Boolean).join("\n");
  }

  // Matn: saytdagi chatga + ikkinchi tomonning bot chatiga
  await db.insert(orderMessages).values({ orderId, authorId: me.id, body: safe.slice(0, 2000), masked, createdAt: now });
  await db.update(orders).set({ lastMessageAt: now }).where(eq(orders.id, orderId));
  if (other?.tgChatId) {
    const r = await tgCall("sendMessage", {
      chat_id: other.tgChatId,
      text: [`💬 <b>«${escapeHtml(title)}»</b> — ${T[from][ol]}`, escapeHtml(safe), masked ? T.maskedNote[ol] : null, `<i>${escapeHtml(T.replyHint[ol])}</i>`]
        .filter(Boolean)
        .join("\n"),
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...openButton(orderId, ol),
    });
    if (r?.ok) await db.update(users).set({ tgOrderId: orderId }).where(eq(users.id, other.id));
  }
  // Qisqa tasdiq: xabarga 👌 reaksiyasi (har bir xabarga matn bilan javob bermaslik uchun)
  await tgCall("setMessageReaction", { chat_id: chatId, message_id: m.messageId, reaction: [{ type: "emoji", emoji: "👌" }] });
  return masked ? T.maskedNote[l] : null;
}
