import "server-only";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { editorProfiles } from "@/db/schema";
import { getCurrentSession, type SessionUser } from "./session";

export type { SessionUser };

export const getCurrentUser = cache(async () => (await getCurrentSession())?.user ?? null);

export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Admin bo'lmaganlarga 404 — panel mavjudligini ham oshkor qilmaymiz */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();
  return user;
}

export const getEditorProfileByUser = cache(async (userId: string) => {
  const rows = await db.select().from(editorProfiles).where(eq(editorProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
});
