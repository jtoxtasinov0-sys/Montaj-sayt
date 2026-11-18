import "server-only";
import { createHash } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { editorProfiles, payments, promotions } from "@/db/schema";
import { audit } from "@/lib/audit";
import { invalidate } from "@/lib/cache";
import { refreshPaymentMessage } from "@/lib/telegram";

const DAY = 86_400_000;

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
  const rows = await db
    .select({ amount: payments.amountUzs })
    .from(payments)
    .where(and(eq(payments.status, "PENDING"), ne(payments.userId, userId)));
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
  const rows = await q.execute<{ used: number; next_free: string | Date | null }>(sql`
    select
      (select count(*)::int from (
        select id from editor_profiles where boost_weight = ${weight} and boost_until > now() and id <> ${selfEditorId}
        union
        select editor_id from payments where status = 'PENDING' and weight = ${weight} and editor_id <> ${selfEditorId}
      ) t) as used,
      (select min(boost_until) from editor_profiles where boost_weight = ${weight} and boost_until > now()) as next_free
  `);
  const r = rows[0];
  return { used: Number(r?.used ?? 0), nextFree: r?.next_free ? new Date(r.next_free) : null };
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
