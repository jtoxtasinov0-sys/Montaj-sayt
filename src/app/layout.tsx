import "@fontsource-variable/dm-sans";
import "@fontsource-variable/onest";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { SpotlightTracker } from "@/components/client-effects";
import { SITE_NAME } from "@/lib/constants";
import { env } from "@/lib/env";
import { getDict, getLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const d = await getDict();
  return {
    metadataBase: new URL(env.appUrl),
    title: { default: d.meta.title, template: `%s — ${SITE_NAME}` },
    description: d.meta.description,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: d.meta.title,
      description: d.meta.description,
      images: [{ url: "/images/og.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: d.meta.title, description: d.meta.description, images: ["/images/og.jpg"] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05050f" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4f8" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [jar, locale] = await Promise.all([cookies(), getLocale()]);
  // Asosiy mavzu — qorong'i. Foydalanuvchi tanlovi cookie'da (server darhol to'g'ri rang bilan chizadi, "miltillash" yo'q)
  const dark = jar.get("theme")?.value !== "light";
  return (
    <html lang={locale} className={dark ? "dark" : undefined} suppressHydrationWarning>
      <body className="min-h-screen">
        {children}
        <SpotlightTracker />
      </body>
    </html>
  );
}
