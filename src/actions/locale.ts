"use server";

import { cookies } from "next/headers";
import { LOCALES, type Locale } from "@/lib/constants";

export async function setLocale(locale: string) {
  if (!(LOCALES as readonly string[]).includes(locale)) return;
  (await cookies()).set("lang", locale as Locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
