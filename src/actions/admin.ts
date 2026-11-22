"use server";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { editorProfiles, orders, priceTiers, promotionPlans, reviews, settings, users } from "@/db/schema";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { destroyAllUserSessions } from "@/lib/auth/session";
import { invalidate } from "@/lib/cache";
import { formatUzs } from "@/lib/utils";
import { MAX_PAYMENT_CARDS, PAYMENT_METHODS } from "@/lib/constants";
import { env } from "@/lib/env";
import { approvePayment, expireStalePayments, grantBoost, matchIncoming, parseAmounts, rejectPayment, removeBoost } from "@/lib/payments";
import { recomputeEditorStats } from "@/lib/ranking";
import { getTelegramWebhookInfo, sendAdminMessage, setTelegramWebhook, telegramEnabled } from "@/lib/telegram";
import { fail, guarded, ok, str } from "./_helpers";

const uuid = z.uuid();
const A = { admin: true, limit: 120 } as const;

// ---------------- to'lovlar ----------------
export async function adminApprovePayment(id: string, _p: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-pay", ...A }, async ({ user }) => {
    if (!uuid.safeParse(id).success) return fail("Noto'g'ri ID");
    const r = await approvePayment(id, { label: user.email, actorId: user.id });
    revalidatePath("/admin", "layout");
    return r.ok ? ok("✅ Tasdiqlandi — TOP faollashdi") : fail("Bu to'lov allaqachon ko'rib chiqilgan");
  });
}

export async function adminRejectPayment(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-pay", ...A }, async ({ user }) => {
    if (!uuid.safeParse(id).success) return fail("Noto'g'ri ID");
    const r = await rejectPayment(id, { label: user.email, actorId: user.id }, str(fd, "reason"));
    revalidatePath("/admin", "layout");
    return r.ok ? ok("Rad etildi") : fail("Bu to'lov allaqachon ko'rib chiqilgan");
  });
}

// ---------------- foydalanuvchilar ----------------
export async function adminSetUserStatus(userId: string, status: "ACTIVE" | "BANNED", _p: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-user", ...A }, async ({ user, ip }) => {
    if (!uuid.safeParse(userId).success) return fail("Noto'g'ri ID");
    if (userId === user.id) return fail("O'zingizni bloklay olmaysiz");
    const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!target) return fail("Topilmadi");
    if (target.role === "ADMIN" && status === "BANNED") return fail("Avval admin huquqini oling");
    await db
      .update(users)
      .set({ status, bannedReason: status === "BANNED" ? str(fd, "reason").slice(0, 200) || null : null })
      .where(eq(users.id, userId));
    await db.update(editorProfiles).set({ isHidden: status === "BANNED" }).where(eq(editorProfiles.userId, userId));
    if (status === "BANNED") await destroyAllUserSessions(userId);
    invalidate("editors:");
    await audit({ actorId: user.id, actorLabel: user.email, action: `user.${status.toLowerCase()}`, targetType: "user", targetId: userId, ip });
    revalidatePath("/admin/users");
    return ok(status === "BANNED" ? "Bloklandi" : "Blokdan chiqarildi");
  });
}

export async function adminSetRole(userId: string, role: "USER" | "ADMIN", _p: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-role", ...A }, async ({ user, ip }) => {
    if (!uuid.safeParse(userId).success) return fail("Noto'g'ri ID");
    if (userId === user.id) return fail("O'z rolingizni o'zgartira olmaysiz");
    const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    if (!target) return fail("Topilmadi");
    if (role === "USER" && env.adminEmails.includes(target.email)) return fail("Bu email ADMIN_EMAILS ro'yxatida");
    await db.update(users).set({ role }).where(eq(users.id, userId));
    await audit({ actorId: user.id, actorLabel: user.email, action: `user.role.${role}`, targetType: "user", targetId: userId, ip });
    revalidatePath("/admin/users");
    return ok("Saqlandi");
  });
}

// ---------------- montajorlar ----------------
export async function adminToggleEditor(editorId: string, field: "isVerified" | "isHidden", _p: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-editor", ...A }, async ({ user, ip }) => {
    if (!uuid.safeParse(editorId).success) return fail("Noto'g'ri ID");
    const col = field === "isVerified" ? editorProfiles.isVerified : editorProfiles.isHidden;
    await db
      .update(editorProfiles)
      .set({ [field]: sql`not ${col}` })
      .where(eq(editorProfiles.id, editorId));
    invalidate("editors:");
    await audit({ actorId: user.id, actorLabel: user.email, action: `editor.toggle.${field}`, targetType: "editor", targetId: editorId, ip });
    revalidatePath("/admin/editors");
    return ok("Saqlandi");
  });
}

export async function adminGrantBoost(editorId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-boost", ...A }, async ({ user }) => {
    if (!uuid.safeParse(editorId).success) return fail("Noto'g'ri ID");
    const days = Number.parseInt(str(fd, "days"), 10);
    if (!(days >= 1 && days <= 90)) return fail("Kun soni 1 dan 90 gacha bo'lsin");
    // Yagona TOP tarifi: qo'lda berilgan TOP ham pullik TOP'lar bilan bir navbatda turadi
    const plan = await topPlan();
    await grantBoost(editorId, days, plan?.weight ?? 10, { label: user.email, actorId: user.id });
    revalidatePath("/admin/editors");
    return ok(`TOP ${days} kunga berildi`);
  });
}

export async function adminRemoveBoost(editorId: string, _p: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-boost", ...A }, async ({ user }) => {
    if (!uuid.safeParse(editorId).success) return fail("Noto'g'ri ID");
    await removeBoost(editorId, { label: user.email, actorId: user.id });
    revalidatePath("/admin/editors");
    return ok("TOP olib tashlandi");
  });
}

// ---------------- buyurtmalar va baholar ----------------
export async function adminCancelOrder(orderId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-order", ...A }, async ({ user, ip }) => {
    if (!uuid.safeParse(orderId).success) return fail("Noto'g'ri ID");
    const rows = await db
      .update(orders)
      .set({ status: "CANCELLED", cancelReason: `admin: ${str(fd, "reason").slice(0, 200)}`, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), ne(orders.status, "COMPLETED")))
      .returning({ id: orders.id });
    if (!rows.length) return fail("Yakunlangan buyurtmani bekor qilib bo'lmaydi");
    invalidate("jobs:");
    await audit({ actorId: user.id, actorLabel: user.email, action: "order.cancel", targetType: "order", targetId: orderId, ip });
    revalidatePath("/admin/orders");
    return ok("Bekor qilindi");
  });
}

export async function adminToggleReview(reviewId: string, _p: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-review", ...A }, async ({ user, ip }) => {
    if (!uuid.safeParse(reviewId).success) return fail("Noto'g'ri ID");
    const [r] = await db
      .update(reviews)
      .set({ isHidden: sql`not ${reviews.isHidden}` })
      .where(eq(reviews.id, reviewId))
      .returning({ editorId: reviews.editorId, isHidden: reviews.isHidden });
    if (!r) return fail("Topilmadi");
    await recomputeEditorStats(r.editorId);
    await audit({ actorId: user.id, actorLabel: user.email, action: r.isHidden ? "review.hide" : "review.show", targetType: "review", targetId: reviewId, ip });
    revalidatePath("/admin/reviews");
    return ok(r.isHidden ? "Yashirildi (reytingdan chiqarildi)" : "Ko'rsatildi");
  });
}

// ---------------- rejalar, kartalar, narx bo'limlari ----------------
/** Saytda bitta TOP tarifi bor — admin faqat uning narxi, muddati va joylar sonini o'zgartiradi */
async function topPlan() {
  const [plan] = await db.select().from(promotionPlans).orderBy(asc(promotionPlans.sort), asc(promotionPlans.id)).limit(1);
  return plan;
}

const planSchema = z.object({
  priceUzs: z.coerce.number().int().min(1000).max(100_000_000),
  days: z.coerce.number().int().min(1).max(90),
  slots: z.coerce.number().int().min(0).max(1000),
});

export async function adminSavePlan(_p: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-plan", ...A }, async ({ user, ip }) => {
    const parsed = planSchema.safeParse({
      priceUzs: str(fd, "priceUzs").replace(/\D/g, ""),
      days: str(fd, "days"),
      slots: str(fd, "slots") || "0",
    });
    if (!parsed.success) return fail("Narx kamida 1 000 so'm, muddat 1–90 kun bo'lsin");
    const values = { ...parsed.data, isActive: fd.get("isActive") === "on" };
    const plan = await topPlan();
    if (plan) await db.update(promotionPlans).set(values).where(eq(promotionPlans.id, plan.id));
    else await db.insert(promotionPlans).values({ name: "TOP", weight: 10, sort: 1, ...values });
    invalidate("plans");
    await audit({ actorId: user.id, actorLabel: user.email, action: "plan.save", targetType: "plan", targetId: String(plan?.id ?? "new"), meta: values, ip });
    revalidatePath("/admin", "layout");
    return ok("Saqlandi — yangi narx darhol saytda ko'rinadi");
  });
}

export async function adminSaveCards(_p: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-cards", ...A }, async ({ user, ip }) => {
    const cards: { type: string; number: string; holder: string; bank: string }[] = [];
    for (let i = 0; i < MAX_PAYMENT_CARDS; i++) {
      const type = str(fd, `type${i}`);
      const number = str(fd, `number${i}`).replace(/[^\d ]/g, "");
      const holder = str(fd, `holder${i}`).slice(0, 60);
      const bank = str(fd, `bank${i}`).slice(0, 60);
      if (!number) continue;
      if (!(PAYMENT_METHODS as readonly string[]).includes(type)) return fail(`Karta ${i + 1}: turi noto'g'ri`);
      if (number.replace(/\s/g, "").length !== 16) return fail(`Karta ${i + 1}: 16 ta raqam bo'lishi kerak`);
      if (!holder) return fail(`Karta ${i + 1}: egasi kiritilmagan`);
      cards.push({ type, number: number.replace(/\s/g, "").replace(/(\d{4})(?=\d)/g, "$1 "), holder, bank });
    }
    if (!cards.length) return fail("Kamida bitta karta kiriting");
    await db
      .insert(settings)
      .values({ key: "payment_cards", value: cards })
      .onConflictDoUpdate({ target: settings.key, set: { value: cards, updatedAt: new Date() } });
    invalidate("settings:");
    await audit({ actorId: user.id, actorLabel: user.email, action: "settings.cards", ip });
    revalidatePath("/admin/settings");
    return ok("Kartalar saqlandi");
  });
}

export async function adminSaveTier(tierId: number | null, _p: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-tier", ...A }, async ({ user, ip }) => {
    const min = Number.parseInt(str(fd, "minUsd"), 10);
    const maxRaw = str(fd, "maxUsd");
    const max = maxRaw ? Number.parseInt(maxRaw, 10) : null;
    const sort = Number.parseInt(str(fd, "sort") || "0", 10);
    if (!(min >= 0 && min <= 100000) || (max !== null && !(max > min && max <= 100000))) return fail("Oraliq noto'g'ri");
    const values = { minUsd: min, maxUsd: max, sort: Number.isFinite(sort) ? sort : 0, isActive: fd.get("isActive") === "on" };
    if (tierId) await db.update(priceTiers).set(values).where(eq(priceTiers.id, tierId));
    else await db.insert(priceTiers).values(values);
    invalidate("tiers");
    invalidate("editors:");
    invalidate("jobs:");
    await audit({ actorId: user.id, actorLabel: user.email, action: "tier.save", meta: values, ip });
    revalidatePath("/admin/settings");
    return ok("Saqlandi");
  });
}

/**
 * Avto-tasdiqlashni sinash: admin bank SMS'i matnini yozadi — u haqiqiy SMS kelgandek tekshiriladi
 * (xuddi SMS forwarder yoki Telegram botdagi kabi). Summa kutilayotgan to'lovga aynan teng bo'lsa — TOP o'zi yoqiladi.
 * Pul haqiqatan tushganini tekshirmaydi: bu faqat admin uchun, "Pul tushdi — tasdiqlash" tugmasi bilan bir xil huquq.
 */
export async function adminTestIncoming(_p: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-test-incoming", ...A }, async ({ user, ip }) => {
    const text = str(fd, "text").slice(0, 2000);
    if (!text) return fail("Bank xabari matnini yozing");
    await expireStalePayments();
    const amounts = parseAmounts(text);
    if (!amounts.length) {
      return fail("Matnda summa topilmadi (yoki bu pul yechilgani haqidagi xabar). Masalan: «Popolnenie: +50 437.00 UZS»");
    }
    const matched = await matchIncoming(amounts, "test", text);
    const found = amounts.map((n) => `${formatUzs(n)} so'm`).join(", ");
    if (!matched.length) {
      return fail(`Mos kutilayotgan to'lov yo'q. Matndan topilgan summa: ${found}. Montajor «TOP ga chiqish»ni bosgan va summa aynan bir xil bo'lishi kerak.`);
    }
    await audit({ actorId: user.id, actorLabel: user.email, action: "payment.auto", targetType: "payment", targetId: matched[0].paymentId, meta: { test: true }, ip });
    revalidatePath("/admin", "layout");
    return ok(matched.map((m) => `✅ Avto-tasdiqlandi: ${m.editor} — ${formatUzs(m.amount)} so'm. TOP yoqildi.`).join(" "));
  });
}

// ---------------- Telegram ----------------
/** Shaxsiy kontaktlarni yashirish (profil, buyurtma, chat) — yoqish/o'chirish */
export async function adminSetContactsHidden(_p: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-contacts", ...A }, async ({ user, ip }) => {
    const hidden = fd.get("hidden") === "on";
    await db
      .insert(settings)
      .values({ key: "contacts_hidden", value: hidden })
      .onConflictDoUpdate({ target: settings.key, set: { value: hidden, updatedAt: new Date() } });
    invalidate("settings:");
    invalidate("editors:");
    await audit({ actorId: user.id, actorLabel: user.email, action: "settings.contacts", meta: { hidden }, ip });
    revalidatePath("/", "layout");
    return ok(hidden ? "Kontaktlar yashirildi — muloqot faqat sayt ichida" : "Kontaktlar ochiq ko'rsatiladi");
  });
}

export async function adminTelegramSetup(_p: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-tg", ...A }, async ({ user, ip }) => {
    if (!env.telegram.token || !env.telegram.webhookSecret) return fail("TELEGRAM_BOT_TOKEN va TELEGRAM_WEBHOOK_SECRET kerak");
    if (!env.appUrl.startsWith("https://")) return fail("Webhook uchun APP_URL https:// bo'lishi kerak");
    const r = await setTelegramWebhook();
    await audit({ actorId: user.id, actorLabel: user.email, action: "telegram.webhook", ip });
    return r?.ok ? ok("Webhook ulandi ✅") : fail(`Xato: ${r?.description ?? "Telegram javob bermadi"}`);
  });
}

export async function adminTelegramTest(_p: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "adm-tg", ...A }, async () => {
    if (!telegramEnabled()) return fail("TELEGRAM_BOT_TOKEN va TELEGRAM_ADMIN_CHAT_ID kerak");
    const r = await sendAdminMessage("✅ <b>Test xabar</b>\nAdmin panel Telegram bilan ulangan.");
    const info = await getTelegramWebhookInfo();
    return r?.ok
      ? ok(`Yuborildi. Webhook: ${info?.result?.url || "ulanmagan"}${info?.result?.last_error_message ? ` (oxirgi xato: ${info.result.last_error_message})` : ""}`)
      : fail(`Xato: ${r?.description ?? "Telegram javob bermadi"}`);
  });
}
