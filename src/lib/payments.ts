import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { editorProfiles, incomingTransfers, payments, promotions } from "@/db/schema";
import { audit } from "@/lib/audit";
import { invalidate } from "@/lib/cache";
import { getPlans } from "@/lib/data";
import { refreshPaymentMessage, sendAdminMessage, escapeHtml } from "@/lib/telegram";
import { formatUzs } from "@/lib/utils";

const DAY = 86_400_000;
/** Chek yuborilmagan kutilayotgan to'lov shuncha vaqt joy band qiladi, keyin o'zi bekor bo'ladi */
export const PENDING_TTL_MS = DAY;

/* ---------------- To'lov kodi ----------------
 * Har bir to'lovchiga reja narxiga 100–999 so'm qo'shiladi (masalan 50 000 → 50 437).
 * Bankda "+50 437" ko'rinsa, bu kimning puli ekanini chek ochmasdan bilasiz.
 * Kod har bir foydalanuvchi uchun doimiy (sahifa yangilansa o'zgarmaydi); faqat boshqa
 * kutilayotgan to'lovda aynan shu summa band bo'lsa, keyingi bo'sh kod olinadi.
 */
const CODE_MIN = 100;
const CODE_SPAN = 900;

export const isValidPayCode = (n: number) => Number.isInteger(n) && n >= CODE_MIN && n < CODE_MIN + CODE_SPAN;

export async function payCodeFor(userId: string, prices: number[]) {
  // So'nggi 24 soatda tasdiqlangan summalar ham band: o'sha pulning kechikkan takror xabari (SMS qayta yuborildi,
  // admin botga ham forward qildi) yangi to'lovni bepul tasdiqlab yubormasligi uchun
  const rows = await db
    .select({ amount: payments.amountUzs })
    .from(payments)
    .where(
      or(
        and(eq(payments.status, "PENDING"), ne(payments.userId, userId)),
        and(eq(payments.status, "APPROVED"), gt(payments.reviewedAt, new Date(Date.now() - PENDING_TTL_MS))),
      ),
    );
  const taken = new Set(rows.map((r) => r.amount));
  const start = Number.parseInt(createHash("sha256").update(userId).digest("hex").slice(0, 8), 16) % CODE_SPAN;
  for (let i = 0; i < CODE_SPAN; i++) {
    const code = CODE_MIN + ((start + i) % CODE_SPAN);
    if (prices.every((p) => !taken.has(p + code))) return code;
  }
  return CODE_MIN + start;
}

/* ---------------- TOP joylari ----------------
 * Rejadagi band joy = shu vazndagi faol TOP montajorlar + shu reja uchun tekshirilayotgan to'lovlar.
 * O'zi allaqachon shu rejada turgan montajor muddatni uzaytira oladi (o'zi hisobga kirmaydi).
 */
type Queryable = Pick<typeof db, "execute">;

export async function slotUsage(weight: number, selfEditorId: string, q: Queryable = db) {
  // Chek yuborilmagan va 24 soatdan eski kutilayotgan to'lov joy band qilmaydi (expireStalePayments uni bekor qiladi)
  const rows = await q.execute<{ used: number; next_free: string | Date | null }>(sql`
    select
      (select count(*)::int from (
        select id from editor_profiles where boost_weight = ${weight} and boost_until > now() and id <> ${selfEditorId}
        union
        select editor_id from payments where status = 'PENDING' and weight = ${weight} and editor_id <> ${selfEditorId}
          and (receipt_key is not null or created_at > now() - interval '24 hours')
      ) t) as used,
      (select min(boost_until) from editor_profiles where boost_weight = ${weight} and boost_until > now()) as next_free
  `);
  const r = rows[0];
  return { used: Number(r?.used ?? 0), nextFree: r?.next_free ? new Date(r.next_free) : null };
}

/** Chek yuborilmagan, 24 soat ichida to'lanmagan to'lovlarni bekor qilish — daqiqasiga ko'pi bilan 1 marta */
let lastStale = 0;
export async function expireStalePayments() {
  const now = Date.now();
  if (now - lastStale < 60_000) return;
  lastStale = now;
  await db
    .update(payments)
    .set({ status: "REJECTED", reviewedBy: "system", reviewedAt: new Date(), adminNote: "24 soat ichida to'lanmadi" })
    .where(and(eq(payments.status, "PENDING"), isNull(payments.receiptKey), lt(payments.createdAt, new Date(now - PENDING_TTL_MS))));
}

/* ---------------- Avtomatik tasdiqlash (bank xabari) ----------------
 * Kartaga pul tushganda bank SMS yoki bildirishnoma yuboradi. Uni ikki yo'l bilan olamiz:
 *  1) Telefondagi "SMS forwarder" ilovasi xabarni POST /api/payments/incoming ga yuboradi (to'liq avtomatik);
 *  2) Admin bank xabarini Telegram botga forward qiladi (bir bosish).
 * Matndagi summalardan biri kutilayotgan to'lov summasiga (narx + shaxsiy kod) AYNAN teng bo'lsa — to'lov
 * tasdiqlanadi. Kodlar takrorlanmaydi (payCodeFor), shuning uchun summa to'lovchini aniq ko'rsatadi.
 */

/** Balans/qoldiq — undan keyingi summa tushgan pul emas */
const BALANCE_LINE = /(balans|balance|qoldiq|ostatok|остаток|dostupno|доступно|💰)/i;
const MONEY = /(?<![\d])(\d{1,3}(?:[ \u00a0\u202f.,]\d{3})+|\d{4,9})(?:[.,]\d{1,2})?(?![\d])/g;

/** Pul chiqib ketgani haqidagi xabar (xarid, yechib olish) — kirim emas */
const DEBIT = /(spisan|списан|pokupka|покупка|oplata|оплата|yechildi|chiqim|xarid|➖)/i;
const CREDIT = /(popoln|пополн|zachisl|зачисл|perevod|перевод|tushdi|kirim|o'tkazma|➕|\+\s?\d)/i;

/** Matndan pul summalarini ajratib olish: "+50 437.00 UZS", "50437,00 so'm", "Popolnenie: 50 437 UZS" → 50437 */
export function parseAmounts(text: string): number[] {
  if (DEBIT.test(text) && !CREDIT.test(text)) return [];
  const out = new Set<number>();
  for (const line of text.split(/\r?\n/)) {
    // "…, dostupno 1 250 437 UZS" — balans so'zidan keyingi qism tashlab yuboriladi
    const cut = line.search(BALANCE_LINE);
    for (const m of (cut >= 0 ? line.slice(0, cut) : line).matchAll(MONEY)) {
      const n = Number.parseInt(m[1].replace(/[^\d]/g, ""), 10);
      if (n >= 1_000 && n <= 100_000_000) out.add(n);
    }
  }
  return [...out];
}

type Matched = { paymentId: string; amount: number; editor: string };

/**
 * Tushgan pullarni kutilayotgan to'lovlarga moslash va tasdiqlash. Har bir summa yozib qo'yiladi:
 * mos to'lov hali bo'lmasa (pul oldinroq tushgan bo'lsa) — to'lov yaratilganda matchPendingWithIncoming topadi.
 */
export async function matchIncoming(found: number[], source: "webhook" | "telegram", raw: string): Promise<Matched[]> {
  // Faqat TOP to'lovi bo'lishi mumkin bo'lgan summalar (narx + 100…999 kod) — karta raqami, yil va h.k. yozilmaydi
  const prices = (await getPlans()).map((p) => p.priceUzs);
  const amounts = prices.length
    ? found.filter((n) => n >= Math.min(...prices) + CODE_MIN && n < Math.max(...prices) + CODE_MIN + CODE_SPAN)
    : found;
  if (!amounts.length) return [];
  const pending = await db
    .select({ id: payments.id, amount: payments.amountUzs, editor: editorProfiles.displayName })
    .from(payments)
    .innerJoin(editorProfiles, eq(editorProfiles.id, payments.editorId))
    .where(and(eq(payments.status, "PENDING"), inArray(payments.amountUzs, amounts)));
  const recentApproved = await db
    .select({ id: payments.id, amount: payments.amountUzs })
    .from(payments)
    .where(
      and(
        eq(payments.status, "APPROVED"),
        inArray(payments.amountUzs, amounts),
        gt(payments.reviewedAt, new Date(Date.now() - PENDING_TTL_MS)),
      ),
    );
  const matched: Matched[] = [];
  for (const amount of amounts) {
    const hits = pending.filter((p) => p.amount === amount);
    // Bir xil summali ikki to'lov bo'lsa (bo'lmasligi kerak) — avtomatik emas, admin hal qiladi
    const hit = hits.length === 1 ? hits[0] : null;
    // Kutilayotgan to'lov yo'q, lekin shu summa yaqinda tasdiqlangan — bu o'sha pulning takror xabari.
    // O'sha to'lovga bog'lab qo'yiladi, aks holda keyingi to'lovni "oldindan tushgan pul" deb tasdiqlab yuborardi
    const duplicateOf = hits.length ? null : (recentApproved.find((r) => r.amount === amount)?.id ?? null);
    const [row] = await db
      .insert(incomingTransfers)
      .values({ amountUzs: amount, source, raw: raw.slice(0, 1000), paymentId: duplicateOf })
      .returning({ id: incomingTransfers.id });
    if (!hit) continue;
    const res = await approvePayment(hit.id, { label: `avto:${source}` });
    if (!res.ok) continue;
    await db.update(incomingTransfers).set({ paymentId: hit.id }).where(eq(incomingTransfers.id, row.id));
    matched.push({ paymentId: hit.id, amount, editor: hit.editor });
  }
  // Webhook orqali kelganda adminga xabar; Telegram'da forward qilinganda bot o'zi javob beradi
  if (matched.length && source === "webhook") {
    sendAdminMessage(
      matched.map((m) => `✅ <b>Avto-tasdiqlandi</b>: ${escapeHtml(m.editor)} — ${formatUzs(m.amount)} so'm. TOP yoqildi.`).join("\n"),
    ).catch(() => {});
  }
  return matched;
}

/** Yangi to'lov yaratilganda: shu summadagi pul so'nggi 24 soatda allaqachon tushgan bo'lsa — darhol tasdiqlash */
export async function matchPendingWithIncoming(paymentId: string, amount: number) {
  const [hit] = await db
    .select({ id: incomingTransfers.id })
    .from(incomingTransfers)
    .where(
      and(
        eq(incomingTransfers.amountUzs, amount),
        isNull(incomingTransfers.paymentId),
        gt(incomingTransfers.createdAt, new Date(Date.now() - PENDING_TTL_MS)),
      ),
    )
    .orderBy(desc(incomingTransfers.createdAt))
    .limit(1);
  if (!hit) return false;
  const res = await approvePayment(paymentId, { label: "avto:oldindan" });
  if (res.ok) await db.update(incomingTransfers).set({ paymentId }).where(eq(incomingTransfers.id, hit.id));
  return res.ok;
}

/** Bir xil vazndagi joy tekshiruvi va to'lov yozilishi bir vaqtda ikki kishiga oxirgi joyni bermasligi uchun */
export const SLOT_LOCK = 774412;

type Reviewer = { label: string; actorId?: string | null };
type Result = { ok: true } | { ok: false; reason: "not_found" | "not_pending" };

/**
 * To'lovni tasdiqlash: admin paneldan ham, Telegram botdan ham shu funksiya chaqiriladi.
 * Tranzaksiya + SELECT ... FOR UPDATE — ikki admin bir vaqtda bosganda ikki marta qo'shilmaydi.
 */
export async function approvePayment(paymentId: string, by: Reviewer): Promise<Result> {
  const res = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update");
    if (!p) return { ok: false, reason: "not_found" } as const;
    if (p.status !== "PENDING") return { ok: false, reason: "not_pending" } as const;
    const [e] = await tx.select().from(editorProfiles).where(eq(editorProfiles.id, p.editorId)).for("update");
    if (!e) return { ok: false, reason: "not_found" } as const;

    const now = new Date();
    const active = e.boostWeight > 0 && e.boostUntil && e.boostUntil > now;
    const start = active ? e.boostUntil! : now;
    const end = new Date(start.getTime() + p.days * DAY);
    const weight = active ? Math.max(e.boostWeight, p.weight) : p.weight;

    await tx.update(payments).set({ status: "APPROVED", reviewedBy: by.label, reviewedAt: now }).where(eq(payments.id, p.id));
    await tx.insert(promotions).values({ editorId: e.id, paymentId: p.id, weight: p.weight, startsAt: start, endsAt: end });
    await tx.update(editorProfiles).set({ boostWeight: weight, boostUntil: end }).where(eq(editorProfiles.id, e.id));
    return { ok: true } as const;
  });
  if (res.ok) {
    invalidate("editors:");
    await audit({ actorId: by.actorId, actorLabel: by.label, action: "payment.approve", targetType: "payment", targetId: paymentId });
    refreshPaymentMessage(paymentId).catch(() => {});
  }
  return res;
}

export async function rejectPayment(paymentId: string, by: Reviewer, reason?: string): Promise<Result> {
  const res = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update");
    if (!p) return { ok: false, reason: "not_found" } as const;
    if (p.status !== "PENDING") return { ok: false, reason: "not_pending" } as const;
    await tx
      .update(payments)
      .set({ status: "REJECTED", reviewedBy: by.label, reviewedAt: new Date(), adminNote: reason?.slice(0, 300) || null })
      .where(eq(payments.id, p.id));
    return { ok: true } as const;
  });
  if (res.ok) {
    await audit({
      actorId: by.actorId,
      actorLabel: by.label,
      action: "payment.reject",
      targetType: "payment",
      targetId: paymentId,
      meta: reason ? { reason } : undefined,
    });
    refreshPaymentMessage(paymentId).catch(() => {});
  }
  return res;
}

/** Admin tomonidan qo'lda TOP berish (masalan, aksiya yoki kompensatsiya uchun) */
export async function grantBoost(editorId: string, days: number, weight: number, by: Reviewer) {
  await db.transaction(async (tx) => {
    const [e] = await tx.select().from(editorProfiles).where(eq(editorProfiles.id, editorId)).for("update");
    if (!e) return;
    const now = new Date();
    const active = e.boostWeight > 0 && e.boostUntil && e.boostUntil > now;
    const start = active ? e.boostUntil! : now;
    const end = new Date(start.getTime() + days * DAY);
    await tx.insert(promotions).values({ editorId, weight, startsAt: start, endsAt: end });
    await tx
      .update(editorProfiles)
      .set({ boostWeight: active ? Math.max(e.boostWeight, weight) : weight, boostUntil: end })
      .where(eq(editorProfiles.id, editorId));
  });
  invalidate("editors:");
  await audit({ actorId: by.actorId, actorLabel: by.label, action: "boost.grant", targetType: "editor", targetId: editorId, meta: { days, weight } });
}

export async function removeBoost(editorId: string, by: Reviewer) {
  await db.update(editorProfiles).set({ boostWeight: 0, boostUntil: null }).where(eq(editorProfiles.id, editorId));
  invalidate("editors:");
  await audit({ actorId: by.actorId, actorLabel: by.label, action: "boost.remove", targetType: "editor", targetId: editorId });
}
