import { and, desc, eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { db } from "@/db";
import { editorProfiles } from "@/db/schema";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.appUrl;
  const editors = await db
    .select({ slug: editorProfiles.slug, updatedAt: editorProfiles.updatedAt })
    .from(editorProfiles)
    .where(and(eq(editorProfiles.isPublished, true), eq(editorProfiles.isHidden, false)))
    .orderBy(desc(editorProfiles.score))
    .limit(5000)
    .catch(() => []);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/editors`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/jobs`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...editors.map((e) => ({ url: `${base}/editors/${e.slug}`, lastModified: e.updatedAt, priority: 0.7 })),
  ];
}
