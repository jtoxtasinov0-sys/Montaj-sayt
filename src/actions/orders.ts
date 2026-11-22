"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { editorProfiles, orderFiles, orders, proposals, reviews } from "@/db/schema";
import type { ActionState } from "@/lib/action-types";
import { audit } from "@/lib/audit";
import { invalidate } from "@/lib/cache";
import { CATEGORY_KEYS, SERVICES } from "@/lib/constants";
import { notifyOrder, type OrderEvent } from "@/lib/notify";
import { postSystemMessage } from "@/lib/order-room";
import { recomputeEditorStats } from "@/lib/ranking";
import { endOfDayInDays, endOfDayTashkent, fail, guarded, isHttpsUrl, ok, str } from "./_helpers";

const uuid = z.uuid();

async function myEditor(userId: string) {
  return (await db.select().from(editorProfiles).where(eq(editorProfiles.userId, userId)).limit(1))[0] ?? null;
}

/** Holat o'zgarishi: loyiha xonasiga tizim xabari + ikkinchi tomonga Telegram bildirishnomasi (javobdan keyin) */
async function event(orderId: string, actorId: string, sys: string | null, notify: OrderEvent | null) {
  if (sys) await postSystemMessage(orderId, sys).catch((e) => console.error("[room] sys message", e));
  if (notify) after(() => notifyOrder(orderId, notify, actorId));
}

function refresh(orderId: string) {
  invalidate("jobs:");
  invalidate("stats:");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/dashboard/orders");
}

const orderSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(4000),
  category: z.enum(CATEGORY_KEYS),
  service: z.enum(SERVICES),
  budgetUsd: z.coerce.number().int().min(5).max(10000),
});

export async function createOrder(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let newId: string | null = null;
  const res = await guarded({ key: "order-create", limit: 10, windowMs: 3_600_000 }, async ({ user, d }) => {
    const parsed = orderSchema.safeParse({
      title: str(fd, "title"),
      description: str(fd, "description"),
      category: str(fd, "category"),
      service: str(fd, "service") || "edit",
      budgetUsd: str(fd, "budgetUsd"),
    });
    if (!parsed.success) return fail(d.errors.validation);
    const deadline = endOfDayTashkent(str(fd, "deadline"));
    if (!deadline || deadline.getTime() < Date.now() || deadline.getTime() > Date.now() + 365 * 86_400_000) {
      return fail(d.errors.deadlinePast);
    }

    let editorId: string | null = null;
    const slug = str(fd, "editor");
    if (slug) {
      const ed = (await db.select().from(editorProfiles).where(eq(editorProfiles.slug, slug)).limit(1))[0];
      if (!ed || !ed.isPublished || ed.isHidden) return fail(d.errors.notFound);
      if (ed.userId === user.id) return fail(d.errors.selfOrder);
      editorId = ed.id;
    }

    const [o] = await db
      .insert(orders)
      .values({
        ...parsed.data,
        clientId: user.id,
        deadline,
        editorId,
        status: editorId ? "PENDING" : "OPEN",
        isPublic: !editorId,
      })
      .returning({ id: orders.id });
    newId = o.id;
    // To'g'ridan-to'g'ri buyurtma: loyiha xonasi darhol ochiladi, mutaxassisga bot orqali xabar
    if (editorId) await event(o.id, user.id, "created", "order_new");
    invalidate("jobs:");
    return ok(d.common.saved);
  });
  if (newId) redirect(`/orders/${newId}`);
  return res;
}

const proposalSchema = z.object({
  priceUsd: z.coerce.number().int().min(5).max(10000),
  days: z.coerce.number().int().min(1).max(90),
  message: z.string().min(10).max(2000),
});

export async function sendProposal(orderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "proposal", limit: 30, windowMs: 3_600_000 }, async ({ user, d }) => {
    if (!uuid.safeParse(orderId).success) return fail(d.errors.notFound);
    const editor = await myEditor(user.id);
    if (!editor || !editor.isPublished || editor.isHidden) return fail(d.errors.notEditor);
    const parsed = proposalSchema.safeParse({ priceUsd: str(fd, "priceUsd"), days: str(fd, "days"), message: str(fd, "message") });
    if (!parsed.success) return fail(d.errors.validation);

    const done = await db.transaction(async (tx) => {
      const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
      if (!o || o.status !== "OPEN" || !o.isPublic) return "state";
      if (o.clientId === user.id) return "self";
      const existing = await tx
        .select({ id: proposals.id })
        .from(proposals)
        .where(and(eq(proposals.orderId, orderId), eq(proposals.editorId, editor.id)))
        .limit(1);
      if (existing.length) {
        await tx
          .update(proposals)
          .set({ ...parsed.data, status: "PENDING" })
          .where(eq(proposals.id, existing[0].id));
      } else {
        await tx.insert(proposals).values({ ...parsed.data, orderId, editorId: editor.id });
        await tx
          .update(orders)
          .set({ proposalCount: sql`${orders.proposalCount} + 1` })
          .where(eq(orders.id, orderId));
        return "new";
      }
      return "ok";
    });
    if (done === "state") return fail(d.errors.badState);
    if (done === "self") return fail(d.errors.selfOrder);
    if (done === "new") await event(orderId, user.id, null, "proposal");
    refresh(orderId);
    return ok(d.common.saved);
  });
}

export async function acceptProposal(proposalId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "proposal-accept", limit: 20 }, async ({ user, d }) => {
    if (!uuid.safeParse(proposalId).success) return fail(d.errors.notFound);
    const result = await db.transaction(async (tx) => {
      const [p] = await tx.select().from(proposals).where(eq(proposals.id, proposalId)).limit(1);
      if (!p) return null;
      const [o] = await tx.select().from(orders).where(eq(orders.id, p.orderId)).for("update");
      if (!o || o.clientId !== user.id || o.status !== "OPEN") return null;
      // Muddat — montajor va'da qilgan kunlar asosida (reyting adolatli bo'lishi uchun)
      await tx
        .update(orders)
        .set({
          editorId: p.editorId,
          agreedPriceUsd: p.priceUsd,
          status: "IN_PROGRESS",
          acceptedAt: new Date(),
          deadline: endOfDayInDays(p.days),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, o.id));
      await tx.update(proposals).set({ status: "ACCEPTED" }).where(eq(proposals.id, p.id));
      await tx
        .update(proposals)
        .set({ status: "REJECTED" })
        .where(and(eq(proposals.orderId, o.id), ne(proposals.id, p.id), eq(proposals.status, "PENDING")));
      return o.id;
    });
    if (!result) return fail(d.errors.badState);
    await event(result, user.id, "accepted", "chosen");
    refresh(result);
    return ok(d.common.saved);
  });
}

/** To'g'ridan-to'g'ri buyurtmaga montajor javobi */
export async function respondToOrder(orderId: string, accept: boolean, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "order-respond", limit: 30 }, async ({ user, d }) => {
    if (!uuid.safeParse(orderId).success) return fail(d.errors.notFound);
    const editor = await myEditor(user.id);
    if (!editor) return fail(d.errors.notEditor);
    const rows = await db
      .update(orders)
      .set(
        accept
          ? { status: "IN_PROGRESS", acceptedAt: new Date(), agreedPriceUsd: sql`${orders.budgetUsd}`, updatedAt: new Date() }
          : { status: "CANCELLED", cancelReason: "declined", updatedAt: new Date() },
      )
      .where(and(eq(orders.id, orderId), eq(orders.editorId, editor.id), eq(orders.status, "PENDING")))
      .returning({ id: orders.id });
    if (!rows.length) return fail(d.errors.badState);
    await event(orderId, user.id, accept ? "accepted" : "declined", accept ? "accepted" : "declined");
    refresh(orderId);
    return ok(d.common.saved);
  });
}

export async function deliverOrder(orderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "order-deliver", limit: 20 }, async ({ user, d }) => {
    if (!uuid.safeParse(orderId).success) return fail(d.errors.notFound);
    const editor = await myEditor(user.id);
    if (!editor) return fail(d.errors.notEditor);
    const url = str(fd, "deliveryUrl");
    const note = str(fd, "deliveryNote").slice(0, 1000);
    if (url && !isHttpsUrl(url)) return fail(d.errors.badUrl);
    // Tayyor ish — loyiha xonasiga yuklangan fayl(lar) yoki havola
    if (!url) {
      const [hasFile] = await db
        .select({ id: orderFiles.id })
        .from(orderFiles)
        .where(and(eq(orderFiles.orderId, orderId), eq(orderFiles.purpose, "result"), eq(orderFiles.status, "ready")))
        .limit(1);
      if (!hasFile) return fail(d.errors.deliverNeedResult);
    }
    const now = new Date();
    const rows = await db
      .update(orders)
      .set({
        status: "DELIVERED",
        deliveryUrl: url || null,
        deliveryNote: note || null,
        deliveredAt: now,
        firstDeliveredAt: sql`coalesce(${orders.firstDeliveredAt}, now())`,
        updatedAt: now,
      })
      .where(and(eq(orders.id, orderId), eq(orders.editorId, editor.id), eq(orders.status, "IN_PROGRESS")))
      .returning({ id: orders.id });
    if (!rows.length) return fail(d.errors.badState);
    await event(orderId, user.id, "delivered", "delivered");
    refresh(orderId);
    return ok(d.common.saved);
  });
}

export async function requestRevision(orderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "order-revision", limit: 20 }, async ({ user, d }) => {
    if (!uuid.safeParse(orderId).success) return fail(d.errors.notFound);
    const note = str(fd, "revisionNote");
    if (note.length < 3 || note.length > 1000) return fail(d.errors.validation);
    const rows = await db
      .update(orders)
      .set({
        status: "IN_PROGRESS",
        revisionNote: note,
        revisionCount: sql`${orders.revisionCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.clientId, user.id), eq(orders.status, "DELIVERED")))
      .returning({ id: orders.id });
    if (!rows.length) return fail(d.errors.badState);
    await event(orderId, user.id, "revision", "revision");
    refresh(orderId);
    return ok(d.common.saved);
  });
}

export async function completeOrder(orderId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "order-complete", limit: 20 }, async ({ user, d }) => {
    if (!uuid.safeParse(orderId).success) return fail(d.errors.notFound);
    const rows = await db
      .update(orders)
      .set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.clientId, user.id), eq(orders.status, "DELIVERED")))
      .returning({ id: orders.id, editorId: orders.editorId });
    if (!rows.length) return fail(d.errors.badState);
    if (rows[0].editorId) await recomputeEditorStats(rows[0].editorId);
    await event(orderId, user.id, "completed", "completed");
    refresh(orderId);
    return ok(d.common.saved);
  });
}

export async function cancelOrder(orderId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "order-cancel", limit: 20 }, async ({ user, d }) => {
    if (!uuid.safeParse(orderId).success) return fail(d.errors.notFound);
    const rows = await db
      .update(orders)
      .set({ status: "CANCELLED", cancelReason: "client", updatedAt: new Date() })
      .where(
        and(eq(orders.id, orderId), eq(orders.clientId, user.id), sql`${orders.status} in ('OPEN','PENDING')`),
      )
      .returning({ id: orders.id, editorId: orders.editorId });
    if (!rows.length) return fail(d.errors.badState);
    // To'g'ridan-to'g'ri buyurtma (mutaxassis bor) bekor qilinsa — xonaga yozamiz va mutaxassisga xabar beramiz
    if (rows[0].editorId) await event(orderId, user.id, "cancelled", "cancelled");
    refresh(orderId);
    return ok(d.common.saved);
  });
}

const reviewSchema = z.object({
  quality: z.coerce.number().int().min(1).max(5),
  communication: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000),
});

export async function submitReview(orderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "review", limit: 10 }, async ({ user, d, ip }) => {
    if (!uuid.safeParse(orderId).success) return fail(d.errors.notFound);
    const parsed = reviewSchema.safeParse({
      quality: str(fd, "quality"),
      communication: str(fd, "communication"),
      comment: str(fd, "comment"),
    });
    if (!parsed.success) return fail(d.errors.validation);
    const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!o || o.clientId !== user.id || o.status !== "COMPLETED" || !o.editorId) return fail(d.errors.badState);
    const onTime = !!o.firstDeliveredAt && o.firstDeliveredAt <= o.deadline;
    const rating = Math.round((parsed.data.quality * 0.7 + parsed.data.communication * 0.3) * 10) / 10;
    const inserted = await db
      .insert(reviews)
      .values({ ...parsed.data, orderId, editorId: o.editorId, authorId: user.id, rating, onTime })
      .onConflictDoNothing()
      .returning({ id: reviews.id });
    if (!inserted.length) return fail(d.errors.badState);
    await recomputeEditorStats(o.editorId);
    await audit({ actorId: user.id, actorLabel: user.email, action: "review.create", targetType: "order", targetId: orderId, ip });
    refresh(orderId);
    return ok(d.order.reviewed);
  });
}
