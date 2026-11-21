"use server";

import { statfs } from "node:fs/promises";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { editorProfiles, portfolioItems, services } from "@/db/schema";
import type { ActionState } from "@/lib/action-types";
import { invalidate } from "@/lib/cache";
import { CATEGORY_KEYS, LIMITS, VIDEO } from "@/lib/constants";
import { env } from "@/lib/env";
import { fmt } from "@/lib/i18n";
import { deleteTmp, deleteUpload, saveImage } from "@/lib/uploads";
import { cleanDriveUrl, cleanHandle, cleanTelegramLink, parseVideoUrl } from "@/lib/video";
import { fail, file, guarded, isHttpsUrl, ok, str } from "./_helpers";

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
      .where(and(eq(portfolioItems.editorId, editor.id), ne(portfolioItems.provider, "upload")));
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
    await deleteUpload(row.videoKey);
    if (row.provider === "upload") await deleteTmp(row.id);
    refresh();
    return ok(d.common.saved);
  });
}

export type StartUploadResult = { ok: true; id: string } | { ok: false; message: string };

/**
 * Video yuklashni boshlash: limitlarni tekshiradi va "uploading" holatidagi yozuv yaratadi.
 * Faylning o'zi keyin bo'laklab PUT /api/portfolio/videos/<id> ga yuboriladi.
 * duration — brauzer o'qigan davomiylik (o'qiy olmasa null); server siqishdan oldin baribir ffprobe bilan tekshiradi.
 */
export async function startVideoUpload(input: {
  title: string;
  category: string;
  size: number;
  duration: number | null;
}): Promise<StartUploadResult> {
  let id: string | null = null;
  const res = await guarded({ key: "video-start", limit: 10 }, async ({ user, d }) => {
    const editor = await myEditor(user.id);
    if (!editor) return fail(d.errors.notEditor);
    const title = String(input?.title ?? "").trim();
    const category = String(input?.category ?? "");
    if (title.length < 2 || title.length > 100) return fail(d.errors.validation);
    if (!(CATEGORY_KEYS as readonly string[]).includes(category)) return fail(d.errors.validation);
    const size = Number(input?.size);
    if (!Number.isSafeInteger(size) || size <= 0 || size > VIDEO.maxUploadBytes) {
      return fail(fmt(d.errors.videoSize, { mb: VIDEO.maxUploadBytes / 1048576 }));
    }
    const duration = input?.duration == null ? null : Number(input.duration);
    if (duration !== null && Number.isFinite(duration) && duration > VIDEO.maxSeconds + 0.5) {
      return fail(fmt(d.errors.videoDuration, { sec: VIDEO.maxSeconds }));
    }

    // Disk to'lib qolsa butun sayt (baza ham) to'xtaydi — joy kam bo'lsa yangi yuklashni qabul qilmaymiz
    try {
      const fs = await statfs(env.uploadDir);
      if (fs.bavail * fs.bsize < size * 1.5 + 2 * 1024 ** 3) return fail(d.errors.videoDisk);
    } catch {}

    const created = await db.transaction(async (tx) => {
      // Ikki tabdan bir vaqtda yuklasa ham limit oshmasligi uchun montajor qatorini qulflaymiz
      await tx.execute(sql`select 1 from ${editorProfiles} where ${editorProfiles.id} = ${editor.id} for update`);
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(portfolioItems)
        .where(
          and(
            eq(portfolioItems.editorId, editor.id),
            eq(portfolioItems.provider, "upload"),
            ne(portfolioItems.videoStatus, "failed"),
          ),
        );
      if (n >= VIDEO.perEditor) return null;
      const [row] = await tx
        .insert(portfolioItems)
        .values({
          editorId: editor.id,
          title,
          url: "",
          provider: "upload",
          category,
          sort: n,
          videoStatus: "uploading",
          uploadBytes: size,
        })
        .returning({ id: portfolioItems.id });
      return row;
    });
    if (!created) return fail(fmt(d.errors.videoLimit, { max: VIDEO.perEditor }));
    id = created.id;
    return ok("");
  });
  return id ? { ok: true, id } : { ok: false, message: res?.message ?? "" };
}

/** Portfolio havolalari: Google Drive, Telegram kanal/guruh, Instagram, YouTube */
export async function savePortfolioLinks(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "portfolio-links", limit: 15 }, async ({ user, d }) => {
    const editor = await myEditor(user.id);
    if (!editor) return fail(d.errors.notEditor);
    const raw = {
      drive: str(fd, "driveUrl"),
      telegram: str(fd, "telegramChannel"),
      instagram: str(fd, "instagram"),
      youtube: str(fd, "youtube"),
    };
    const driveUrl = cleanDriveUrl(raw.drive);
    const telegramChannel = cleanTelegramLink(raw.telegram);
    const instagram = cleanHandle(raw.instagram);
    if (raw.drive && !driveUrl) return fail(d.errors.badDrive);
    if (raw.telegram && !telegramChannel) return fail(d.errors.badTelegram);
    if (raw.instagram && !instagram) return fail(d.errors.badInstagram);
    if (raw.youtube && !isHttpsUrl(raw.youtube)) return fail(d.errors.badUrl);
    await db
      .update(editorProfiles)
      .set({ driveUrl, telegramChannel, instagram, youtube: raw.youtube || null, updatedAt: new Date() })
      .where(eq(editorProfiles.id, editor.id));
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
