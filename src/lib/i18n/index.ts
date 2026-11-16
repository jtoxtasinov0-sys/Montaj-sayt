import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/constants";
import { en } from "./en";
import { ru } from "./ru";
import { uz, type Dict } from "./uz";

const dicts: Record<Locale, Dict> = { uz, ru, en };

export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get("lang")?.value;
  return (LOCALES as readonly string[]).includes(v ?? "") ? (v as Locale) : DEFAULT_LOCALE;
});

export const getDict = cache(async (): Promise<Dict> => dicts[await getLocale()]);

export { fmt } from "./fmt";
export type { Dict };
