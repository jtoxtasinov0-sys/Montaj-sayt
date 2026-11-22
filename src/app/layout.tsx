import "@fontsource-variable/onest";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { MotionRoot } from "@/components/client-effects";
import { PwaInstall } from "@/components/pwa";
import { SITE_NAME } from "@/lib/constants";
import { env } from "@/lib/env";
import { getDict, getLocale } from "@/lib/i18n";
import { OG_IMAGE, OG_LOCALE } from "@/lib/seo";

// Asosiy shrift — Delight (lotin). Kirill harflari yo'q, ruscha matn Onest bilan chiqadi.
const delight = localFont({
  src: "./fonts/delight.woff2",
  weight: "100 900",
  variable: "--font-delight",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const [d, locale] = await Promise.all([getDict(), getLocale()]);
  return {
    metadataBase: new URL(env.appUrl),
    title: { default: d.meta.title, template: `%s — ${SITE_NAME}` },
    description: d.meta.description,
    keywords: d.meta.keywords,
    applicationName: SITE_NAME,
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "business",
    formatDetection: { telephone: false, email: false, address: false },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    // Google Search Console / Yandex Webmaster "HTML tag" usuli bilan tasdiqlash (ixtiyoriy, .env da)
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      yandex: process.env.YANDEX_VERIFICATION || undefined,
    },
    // PWA: telefonda bosh ekrandan alohida ilova kabi ochiladi (manifest: app/manifest.ts, service worker: public/sw.js)
    appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
    // Sahifa o'zi bermasa — havola ko'rinishi bosh sahifaniki (rasm: lib/seo.ts → OG_IMAGE)
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      title: d.meta.title,
      description: d.meta.description,
      images: [{ ...OG_IMAGE, alt: d.meta.title }],
    },
    twitter: { card: "summary_large_image", title: d.meta.title, description: d.meta.description, images: [OG_IMAGE.url] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [jar, locale, d] = await Promise.all([cookies(), getLocale(), getDict()]);
  // Asosiy mavzu — oq. Qora mavzu tugma bilan yoqiladi; tanlov cookie'da (server darhol to'g'ri rang bilan chizadi, "miltillash" yo'q)
  const dark = jar.get("theme")?.value === "dark";
  return (
    // data-scroll-behavior: sahifadan sahifaga o'tishda Next.js skrollni darhol (animatsiyasiz) qiladi —
    // aks holda globals.css dagi "scroll-behavior: smooth" har bir o'tishda sahifani sekin tepaga suradi
    <html
      lang={locale}
      className={dark ? `dark ${delight.variable}` : delight.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen">
        {/* PWA: brauzer "o'rnatish mumkin" hodisasini React yuklanishidan oldin yuborishi mumkin — erta ushlab qolamiz (components/pwa.tsx) */}
        <script
          dangerouslySetInnerHTML={{
            __html: "addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e})",
          }}
        />
        {children}
        <MotionRoot />
        <PwaInstall labels={{ ...d.pwa, close: d.common.close, copy: d.common.copy, copied: d.common.copied }} />
      </body>
    </html>
  );
}
