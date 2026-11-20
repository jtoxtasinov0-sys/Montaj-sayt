"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { editorProfiles, payments, promotionPlans } from "@/db/schema";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { getPaymentCards, getPlans } from "@/lib/data";
import { expireStalePayments, matchPendingWithIncoming, payCodeFor, SLOT_LOCK, slotUsage } from "@/lib/payments";
import { notifyNewPayment } from "@/lib/telegram";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { fail, file, guarded, ok, str } from "./_helpers";

/**
 * 1-qadam: "TOP ga chiqish" — kutilayotgan to'lov yaratiladi (shaxsiy summa: narx + kod) va joy 24 soat band qilinadi.
 * Chek kerak emas: kartaga aynan shu summa tushganda bank xabaridan avtomatik tasdiqlanadi (lib/payments → matchIncoming).
 */
export async function startPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "payment", limit: 8, windowMs: 3_600_000 }, async ({ user, d, ip }) => {
    const editor = (await db.select().from(editorProfiles).where(eq(editorProfiles.userId, user.id)).limit(1))[0];
    if (!editor) return fail(d.promote.needProfile);
    await expireStalePayments();

    const planId = Number.parseInt(str(fd, "planId"), 10);
    const plan = Number.isFinite(planId)
      ? (await db.select().from(promotionPlans).where(eq(promotionPlans.id, planId)).limit(1))[0]
      : undefined;
    if (!plan || !plan.isActive) return fail(d.errors.validation);

    const pending = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.userId, user.id), eq(payments.status, "PENDING")))
      .limit(1);
    if (pending.length) return fail(d.errors.pendingPayment);

    if (plan.slots > 0 && (await slotUsage(plan.weight, editor.id)).used >= plan.slots) return fail(d.promote.full);

    const payCode = await payCodeFor(user.id, (await getPlans()).map((x) => x.priceUzs));
    const cards = await getPaymentCards();
    const p = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${SLOT_LOCK}, ${plan.weight})`);
      if (plan.slots > 0 && (await slotUsage(plan.weight, editor.id, tx)).used >= plan.slots) return null;
      const [row] = await tx
        .insert(payments)
        .values({
          userId: user.id,
          editorId: editor.id,
          planId: plan.id,
          planName: plan.name,
          days: plan.days,
          weight: plan.weight,
          amountUzs: plan.priceUzs + payCode,
          payCode,
          method: cards[0]?.type ?? "CARD",
        })
        .returning({ id: payments.id, amountUzs: payments.amountUzs });
      return row;
    });
    if (!p) return fail(d.promote.full);

    await audit({ actorId: user.id, actorLabel: user.email, action: "payment.create", targetType: "payment", targetId: p.id, ip });
    // Pul oldinroq tushgan bo'lsa (kamdan-kam) — darhol tasdiqlanadi
    await matchPendingWithIncoming(p.id, p.amountUzs);
    revalidatePath("/dashboard/promote");
    return ok(d.promote.started);
  });
}

/** Zaxira yo'l: 30 daqiqada avtomatik tasdiqlanmasa — chek yuboriladi, admin qo'lda tekshiradi (Telegram tugmalari bilan) */
export async function attachReceipt(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "payment-receipt", limit: 5, windowMs: 3_600_000 }, async ({ user, d, ip }) => {
    const [p] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.userId, user.id), eq(payments.status, "PENDING")))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    if (!p) return fail(d.errors.notFound);
    const receiptKey = (await saveImage(file(fd, "receipt"), "receipts", true))!;
    const updated = await db
      .update(payments)
      .set({ receiptKey, payerNote: str(fd, "payerNote").slice(0, 200) })
      .where(and(eq(payments.id, p.id), eq(payments.status, "PENDING")))
      .returning({ id: payments.id });
    if (!updated.length) {
      await deleteUpload(receiptKey);
      return fail(d.errors.badState);
    }
    if (p.receiptKey) await deleteUpload(p.receiptKey);
    await audit({ actorId: user.id, actorLabel: user.email, action: "payment.receipt", targetType: "payment", targetId: p.id, ip });
    // Javobni kutib turmasdan Telegram'ga yuborish
    after(() => notifyNewPayment(p.id));
    revalidatePath("/dashboard/promote");
    return ok(d.promote.receiptSent);
  });
}

/** Foydalanuvchi o'z kutilayotgan to'lovini bekor qiladi (joy bo'shaydi) */
export async function cancelPayment(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "payment-cancel", limit: 10, windowMs: 3_600_000 }, async ({ user, d, ip }) => {
    const rows = await db
      .update(payments)
      .set({ status: "REJECTED", reviewedBy: user.email, reviewedAt: new Date(), adminNote: d.promote.cancelled })
      .where(and(eq(payments.userId, user.id), eq(payments.status, "PENDING")))
      .returning({ id: payments.id });
    if (!rows.length) return fail(d.errors.notFound);
    await audit({ actorId: user.id, actorLabel: user.email, action: "payment.cancel", targetType: "payment", targetId: rows[0].id, ip });
    revalidatePath("/dashboard/promote");
    return ok(d.promote.cancelled);
  });
}
