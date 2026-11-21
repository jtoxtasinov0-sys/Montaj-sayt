import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/constants";
import { uz } from "@/lib/i18n/uz";

/** Telefonda "Bosh ekranga qo'shish" va Android/Google uchun ilova ma'lumotlari (oq-qora belgi) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: uz.meta.title,
    short_name: SITE_NAME,
    description: uz.meta.description,
    lang: "uz",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
