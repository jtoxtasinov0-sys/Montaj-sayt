import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    // Montajor rasmlari va muqovalar (/api/files/avatars|covers) Google Rasmlar uchun ochiq; cheklar (receipts) yopiq
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/files/avatars/", "/api/files/covers/"],
        disallow: ["/admin", "/dashboard", "/api/", "/orders/new", "/login"],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
