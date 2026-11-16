"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { editorProfiles, portfolioItems, services } from "@/db/schema";
import type { ActionState } from "@/lib/action-types";
import { invalidate } from "@/lib/cache";
import { CATEGORY_KEYS, LIMITS } from "@/lib/constants";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { parseVideoUrl } from "@/lib/video";
import { fail, file, guarded, ok, str } from "./_helpers";

async function myEditor(userId: string) {
  return (await db.select().from(editorProfiles).where(eq(editorProfiles.userId, userId)).limit(1))[0] ?? null;
}

function refresh() {
  invalidate("editors:");
  revalidatePath("/dashboard", "layout");
}

export async function addPortfolioItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "portfolio", limit: 20 }, async ({ user, d }) => {
    const editor = await myEditor(user.id);
    if (!editor) return fail(d.errors.notEditor);
    const title = str(fd, "title");
    const category = str(fd, "category");
    if (title.length < 2 || title.length > 100) return fail(d.errors.validation);
    if (!(CATEGORY_KEYS as readonly string[]).includes(category)) return fail(d.errors.validation);
    const video = parseVideoUrl(str(fd, "url"));
    if (!video || video.url.length > 500) return fail(d.errors.badUrl);
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(portfolioItems)
      .where(eq(portfolioItems.editorId, editor.id));
    if (n >= LIMITS.portfolioItems) return fail(d.errors.limit);
    const coverKey = await saveImage(file(fd, "cover"), "covers");
    await db.insert(portfolioItems).values({
      editorId: editor.id,
      title,
      url: video.url,
      provider: video.provider,
      embedId: video.embedId,
      category,
      coverKey,
      sort: n,
    });
    refresh();
    return ok(d.common.saved);
  });
}

export async function deletePortfolioItem(id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "portfolio-del", limit: 30 }, async ({ user, d }) => {
    const editor = await myEditor(user.id);
    if (!editor || !z.uuid().safeParse(id).success) return fail(d.errors.notFound);
    const [row] = await db
      .delete(portfolioItems)
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.editorId, editor.id)))
      .returning();
    if (!row) return fail(d.errors.notFound);
    await deleteUpload(row.coverKey);
    refresh();
    return ok(d.common.saved);
  });
}

const serviceSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(600),
  priceUsd: z.coerce.number().int().min(1).max(10000),
  deliveryDays: z.coerce.number().int().min(1).max(90),
});

export async function addService(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "service", limit: 20 }, async ({ user, d }) => {
    const editor = await myEditor(user.id);
    if (!editor) return fail(d.errors.notEditor);
    const parsed = serviceSchema.safeParse({
      title: str(fd, "title"),
      description: str(fd, "description"),
      priceUsd: str(fd, "priceUsd"),
      deliveryDays: str(fd, "deliveryDays"),
    });
    if (!parsed.success) return fail(d.errors.validation);
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(services).where(eq(services.editorId, editor.id));
    if (n >= LIMITS.services) return fail(d.errors.limit);
    await db.insert(services).values({ ...parsed.data, editorId: editor.id, sort: n });
    refresh();
    return ok(d.common.saved);
  });
}

export async function deleteService(id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  return guarded({ key: "service-del", limit: 30 }, async ({ user, d }) => {
    const editor = await myEditor(user.id);
    if (!editor || !z.uuid().safeParse(id).success) return fail(d.errors.notFound);
    await db.delete(services).where(and(eq(services.id, id), eq(services.editorId, editor.id)));
    refresh();
    return ok(d.common.saved);
  });
}
