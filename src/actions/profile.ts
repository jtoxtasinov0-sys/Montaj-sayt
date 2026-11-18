"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { editorProfiles, users } from "@/db/schema";
import type { ActionState } from "@/lib/action-types";
import { invalidate } from "@/lib/cache";
import { CATEGORY_KEYS, LEVELS, SOFTWARE } from "@/lib/constants";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { keyFromUploadUrl, uploadUrl } from "@/lib/uploads-url";
import { cleanHandle } from "@/lib/video";
import { computeScore } from "@/lib/ranking";
import { fail, file, guarded, isHttpsUrl, ok, str } from "./_helpers";

const RESERVED = new Set(["new", "admin", "api", "edit", "dashboard", "login", "me", "top"]);

const profileSchema = z.object({
  displayName: z.string().min(2).max(60),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  headline: z.string().max(140),
  bio: z.string().max(3000),
  city: z.string().max(60),
  level: z.enum(LEVELS),
  experienceYears: z.coerce.number().int().min(0).max(50),
  priceFrom: z.coerce.number().int().min(5).max(5000),
});

export async function saveEditorProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let created = false;
  const res = await guarded({ key: "profile", limit: 15 }, async ({ user, d }) => {
    const parsed = profileSchema.safeParse({
      displayName: str(fd, "displayName"),
      slug: str(fd, "slug").toLowerCase(),
      headline: str(fd, "headline"),
      bio: str(fd, "bio"),
      city: str(fd, "city"),
      level: str(fd, "level"),
      experienceYears: str(fd, "experienceYears") || "0",
      priceFrom: str(fd, "priceFrom"),
    });
    if (!parsed.success) return fail(d.errors.validation);
    const v = parsed.data;
    if (RESERVED.has(v.slug)) return fail(d.errors.slugTaken);

    const skills = fd.getAll("skills").filter((s): s is string => typeof s === "string" && (SOFTWARE as readonly string[]).includes(s));
    const categories = fd
      .getAll("categories")
      .filter((s): s is string => typeof s === "string" && (CATEGORY_KEYS as readonly string[]).includes(s))
      .slice(0, 6);
    const youtube = str(fd, "youtube");
    if (youtube && !isHttpsUrl(youtube)) return fail(d.errors.badUrl);

    const taken = await db
      .select({ id: editorProfiles.id })
      .from(editorProfiles)
      .where(and(eq(editorProfiles.slug, v.slug), ne(editorProfiles.userId, user.id)))
      .limit(1);
    if (taken.length) return fail(d.errors.slugTaken);

    const existing = (await db.select().from(editorProfiles).where(eq(editorProfiles.userId, user.id)).limit(1))[0];

    const values = {
      ...v,
      skills,
      categories,
      telegram: cleanHandle(str(fd, "telegram")),
      telegramChannel: cleanHandle(str(fd, "telegramChannel")),
      instagram: cleanHandle(str(fd, "instagram")),
      youtube: youtube || null,
      isAvailable: fd.get("isAvailable") === "on",
      isPublished: fd.get("isPublished") === "on",
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(editorProfiles).set(values).where(eq(editorProfiles.id, existing.id));
    } else {
      await db.insert(editorProfiles).values({
        ...values,
        userId: user.id,
        score: computeScore({ ratingAvg: 0, ratingCount: 0, completed: 0, onTime: 0 }),
      });
      created = true;
    }
    invalidate("editors:");
    invalidate("jobs:");
    revalidatePath("/dashboard", "layout");
    return ok(d.common.saved);
  });
  if (created) redirect("/dashboard/portfolio");
  return res;
}

/**
 * Profil rasmini almashtirish (kabinet sarlavhasidagi rasm ustiga bosib).
 * Rasm brauzerda kesilib (512×512) yuboriladi; server baribir qayta tekshirib, qayta kodlaydi.
 * Bitta fayl ham foydalanuvchiga (sayt sarlavhasi, buyurtmalar), ham montajor profiliga yoziladi.
 */
export async function updateAvatar(fd: FormData): Promise<ActionState> {
  return guarded({ key: "avatar", limit: 10 }, async ({ user, d }) => {
    const key = await saveImage(file(fd, "avatar"), "avatars", true);
    if (!key) return fail(d.errors.uploadRequired);
    const [editor] = await db
      .select({ id: editorProfiles.id, avatarKey: editorProfiles.avatarKey })
      .from(editorProfiles)
      .where(eq(editorProfiles.userId, user.id))
      .limit(1);

    await db.update(users).set({ image: uploadUrl(key) }).where(eq(users.id, user.id));
    if (editor) await db.update(editorProfiles).set({ avatarKey: key, updatedAt: new Date() }).where(eq(editorProfiles.id, editor.id));

    // Eski yuklangan rasmlarni o'chirish (Google rasmiga tegmaymiz)
    const old = new Set([editor?.avatarKey, keyFromUploadUrl(user.image)]);
    old.delete(key);
    for (const k of old) await deleteUpload(k);

    if (editor) invalidate("editors:");
    revalidatePath("/", "layout");
    return ok(d.common.saved);
  });
}

const settingsSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z
    .string()
    .max(20)
    .regex(/^[+\d\s()-]*$/),
});

export async function saveUserSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded({ key: "settings", limit: 15 }, async ({ user, d }) => {
    const parsed = settingsSchema.safeParse({ name: str(fd, "name"), phone: str(fd, "phone") });
    if (!parsed.success) return fail(d.errors.validation);
    await db
      .update(users)
      .set({ name: parsed.data.name, phone: parsed.data.phone || null, telegram: cleanHandle(str(fd, "telegram")) })
      .where(eq(users.id, user.id));
    revalidatePath("/dashboard", "layout");
    return ok(d.common.saved);
  });
}
