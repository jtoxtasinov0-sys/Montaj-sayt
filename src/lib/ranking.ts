import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { editorProfiles, orders, reviews } from "@/db/schema";
import { invalidate } from "@/lib/cache";

import { computeScore } from "./ranking-shared";

export { computeScore, isTopRated } from "./ranking-shared";

export async function recomputeEditorStats(editorId: string) {
  const [o] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${orders.status} = 'COMPLETED')::int`,
      onTime: sql<number>`count(*) filter (where ${orders.status} = 'COMPLETED' and ${orders.firstDeliveredAt} <= ${orders.deadline})::int`,
    })
    .from(orders)
    .where(eq(orders.editorId, editorId));
  const [r] = await db
    .select({
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(and(eq(reviews.editorId, editorId), eq(reviews.isHidden, false)));

  const stats = { ratingAvg: Math.round(r.avg * 100) / 100, ratingCount: r.count, completed: o.completed, onTime: o.onTime };
  await db
    .update(editorProfiles)
    .set({
      ratingAvg: stats.ratingAvg,
      ratingCount: stats.ratingCount,
      completedOrders: stats.completed,
      onTimeOrders: stats.onTime,
      score: computeScore(stats),
      updatedAt: new Date(),
    })
    .where(eq(editorProfiles.id, editorId));
  invalidate("editors:");
}

/** Muddati tugagan TOP joylashuvlarni o'chirish — daqiqasiga ko'pi bilan 1 marta */
let lastExpire = 0;
export async function expireBoosts() {
  const now = Date.now();
  if (now - lastExpire < 60_000) return;
  lastExpire = now;
  const res = await db
    .update(editorProfiles)
    .set({ boostWeight: 0 })
    .where(and(gt(editorProfiles.boostWeight, 0), lt(editorProfiles.boostUntil, new Date())))
    .returning({ id: editorProfiles.id });
  if (res.length) invalidate("editors:");
}

/** Profil ko'rishlarini xotirada yig'ib, 30 soniyada bir yozish (har bir ko'rishda DB'ga yozmaslik uchun) */
const viewBuffer = new Map<string, number>();
let flushTimer: NodeJS.Timeout | null = null;
export function trackView(editorId: string) {
  viewBuffer.set(editorId, (viewBuffer.get(editorId) ?? 0) + 1);
  if (!flushTimer) {
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      const entries = [...viewBuffer.entries()];
      viewBuffer.clear();
      for (const [id, n] of entries) {
        await db
          .update(editorProfiles)
          .set({ views: sql`${editorProfiles.views} + ${n}` })
          .where(eq(editorProfiles.id, id))
          .catch(() => {});
      }
    }, 30_000);
    flushTimer.unref?.();
  }
}
