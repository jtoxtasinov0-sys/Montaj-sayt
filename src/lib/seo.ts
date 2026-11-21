import type { Metadata } from "next";
import { SITE_NAME, type Locale } from "@/lib/constants";

/**
 * Havola ko'rinishi (Telegram, Instagram, Facebook, X) uchun asosiy rasm — 1200×630.
 * Rasm o'zgarsa yangi fayl nomi bering (og-home-v4.jpg): Telegram eski rasmni shu manzil bo'yicha uzoq saqlaydi.
 */
export const OG_IMAGE = { url: "/images/og-home-v3.jpg", width: 1200, height: 630 } as const;

export const OG_LOCALE: Record<Locale, string> = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" };

/**
 * Ochiq sahifa uchun metadata: sarlavha, tavsif, canonical manzil va havola ko'rinishi bir joyda.
 * `openGraph` ota layout'dan qisman emas, butunlay almashadi — shuning uchun har sahifada to'liq beriladi.
 * `image: false` — rasmni shu sahifaning o'zidagi opengraph-image fayli beradi (masalan montajor profili).
 */
export function pageMeta(o: {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  /** true — sarlavha shablonsiz ("… — Montaj Club" qo'shilmaydi), bosh sahifa uchun */
  absoluteTitle?: boolean;
  type?: "website" | "profile";
  image?: false;
}): Metadata {
  const fullTitle = o.absoluteTitle ? o.title : `${o.title} — ${SITE_NAME}`;
  const images = o.image === false ? undefined : [{ ...OG_IMAGE, alt: fullTitle }];
  return {
    title: o.absoluteTitle ? { absolute: o.title } : o.title,
    description: o.description,
    alternates: { canonical: o.path },
    openGraph: {
      type: o.type ?? "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[o.locale],
      url: o.path,
      title: fullTitle,
      description: o.description,
      ...(images && { images }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: o.description,
      ...(images && { images: [OG_IMAGE.url] }),
    },
  };
}

/** JSON-LD'ni xavfsiz <script> ichiga joylash (`</script>` bilan sahifani buzib bo'lmaydi) */
export function jsonLdHtml(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
