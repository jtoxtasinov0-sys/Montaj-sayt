import type { Metadata } from "next";
import { getDict, getLocale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { Catalog, type CatalogSP } from "./catalog";

export async function generateMetadata(): Promise<Metadata> {
  const [d, locale] = await Promise.all([getDict(), getLocale()]);
  // Filtr/sahifa parametrlari bilan ochilsa ham canonical — /editors (Google dublikat sahifa deb hisoblamaydi)
  return pageMeta({ title: d.meta.editorsTitle, description: d.meta.editorsDescription, path: "/editors", locale });
}

export default async function EditorsPage({ searchParams }: { searchParams: Promise<CatalogSP> }) {
  return <Catalog sp={await searchParams} />;
}
