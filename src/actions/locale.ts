"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/current";
import { LOCALES, type Locale } from "@/lib/constants";

export async function setLocale(locale: string) {
  if (!(LOCALES as readonly string[]).includes(locale)) return;
  (await cookies()).set("lang", locale as Locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  // Telegram bot xabarlari shu tilda yuborilishi uchun
  const user = await getCurrentUser();
  if (user) await db.update(users).set({ locale }).where(eq(users.id, user.id)).catch(() => {});
}
