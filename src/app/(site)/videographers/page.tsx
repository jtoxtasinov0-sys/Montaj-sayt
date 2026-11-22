import type { Metadata } from "next";
import { getDict, getLocale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { Catalog, type CatalogSP } from "../editors/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const [d, locale] = await Promise.all([getDict(), getLocale()]);
  return pageMeta({
    title: d.editors.titleVideographers,
    description: d.editors.subtitleVideographers,
    path: "/videographers",
    locale,
  });
}

/** Faqat videograflar (katalogning o'zi, role=videographer bilan) */
export default async function VideographersPage({ searchParams }: { searchParams: Promise<CatalogSP> }) {
  return <Catalog sp={{ ...(await searchParams), role: "videographer" }} />;
}
