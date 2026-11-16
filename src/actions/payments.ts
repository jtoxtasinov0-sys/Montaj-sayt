"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { editorProfiles, payments, promotionPlans } from "@/db/schema";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { getPaymentCards } from "@/lib/data";
import { notifyNewPayment } from "@/lib/telegram";
import { saveImage } from "@/lib/uploads";
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

    const receiptKey = await saveImage(file(fd, "receipt"), "receipts", true);
    const [p] = await db
      .insert(payments)
      .values({
        userId: user.id,
        editorId: editor.id,
        planId: plan.id,
        planName: plan.name,
        days: plan.days,
        weight: plan.weight,
        amountUzs: plan.priceUzs,
        method,
        payerNote: str(fd, "payerNote").slice(0, 200),
        receiptKey: receiptKey!,
      })
      .returning({ id: payments.id });

    await audit({ actorId: user.id, actorLabel: user.email, action: "payment.create", targetType: "payment", targetId: p.id, ip });
    // Javobni kutib turmasdan Telegram'ga yuborish
    after(() => notifyNewPayment(p.id));
    revalidatePath("/dashboard/promote");
    return ok(d.promote.sent);
  });
}
