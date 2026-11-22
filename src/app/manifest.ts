import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/constants";
import { uz } from "@/lib/i18n/uz";

/**
 * PWA manifest: telefonda "Bosh ekranga qo'shish" / "Ilovani o'rnatish" — sayt alohida ilova kabi ochiladi
 * (manzil satrisiz, o'z ikonkasi bilan). Ishlashi uchun public/sw.js (service worker) ham kerak.
 */
export default function manifest(): MetadataRoute.Manifest {
  const icon = [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }];
  return {
    id: "/",
    // O'rnatilgan ilova nomi (ish stoli / bosh ekran ikonkasi ostida) — faqat sayt nomi, uzun SEO sarlavhasi emas
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: uz.meta.description,
    lang: "uz",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "productivity", "photo"],
    prefer_related_applications: false,
    // Sayt o'zini "o'rnatilganmi?" deb tekshira olishi uchun (navigator.getInstalledRelatedApps, components/pwa.tsx)
    // (manifest build paytida tayyorlanadi — manzil nisbiy, brauzer uni manifest manzili bo'yicha to'ldiradi)
    related_applications: [{ platform: "webapp", url: "/manifest.webmanifest" }],
    // Ilova ikonkasi bosilganda — yangi oyna emas, ochiq turgan oynaga qaytadi
    launch_handler: { client_mode: ["navigate-existing", "auto"] },
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Ikonkani bosib turganda chiqadigan tezkor menyu (Android)
    shortcuts: [
      { name: uz.nav.editors, url: "/editors", icons: icon },
      { name: uz.nav.jobs, url: "/jobs", icons: icon },
      { name: uz.nav.postJob, url: "/orders/new", icons: icon },
      { name: uz.common.dashboard, url: "/dashboard", icons: icon },
    ],
  };
}
