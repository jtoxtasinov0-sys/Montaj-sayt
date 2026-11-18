"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { editorProfiles, payments, promotionPlans } from "@/db/schema";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { getPaymentCards, getPlans } from "@/lib/data";
import { isValidPayCode, payCodeFor, SLOT_LOCK, slotUsage } from "@/lib/payments";
import { notifyNewPayment } from "@/lib/telegram";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { fail, file, guarded, ok, str } from "./_helpers";

export async function submitPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "payment", limit: 5, windowMs: 3_600_000 }, async ({ user, d, ip }) => {
    const editor = (await db.select().from(editorProfiles).where(eq(editorProfiles.userId, user.id)).limit(1))[0];
    if (!editor) return fail(d.promote.needProfile);

    const planId = Number.parseInt(str(fd, "planId"), 10);
    const plan = Number.isFinite(planId)
      ? (await db.select().from(promotionPlans).where(eq(promotionPlans.id, planId)).limit(1))[0]
      : undefined;
    if (!plan || !plan.isActive) return fail(d.errors.validation);

    const cards = await getPaymentCards();
    const method = str(fd, "method");
    if (!cards.some((c) => c.type === method)) return fail(d.errors.validation);

    const pending = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.userId, user.id), eq(payments.status, "PENDING")))
      .limit(1);
    if (pending.length) return fail(d.errors.pendingPayment);

    // Joy qolmagan bo'lsa — chek yuklashdan oldin to'xtatamiz
    if (plan.slots > 0 && (await slotUsage(plan.weight, editor.id)).used >= plan.slots) return fail(d.promote.full);

    // Foydalanuvchi sahifada ko'rgan (va o'tkazgan) kod; bo'lmasa qayta hisoblaymiz
    const sent = Number.parseInt(str(fd, "payCode"), 10);
    const payCode = isValidPayCode(sent) ? sent : await payCodeFor(user.id, (await getPlans()).map((x) => x.priceUzs));

    const receiptKey = (await saveImage(file(fd, "receipt"), "receipts", true))!;
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
          method,
          payerNote: str(fd, "payerNote").slice(0, 200),
          receiptKey,
        })
        .returning({ id: payments.id });
      return row;
    });
    if (!p) {
      await deleteUpload(receiptKey);
      return fail(d.promote.full);
    }

    await audit({ actorId: user.id, actorLabel: user.email, action: "payment.create", targetType: "payment", targetId: p.id, ip });
    // Javobni kutib turmasdan Telegram'ga yuborish
    after(() => notifyNewPayment(p.id));
    revalidatePath("/dashboard/promote");
    return ok(d.promote.sent);
  });
}
