import "server-only";

/**
 * Xotirada ishlaydigan "fixed window" rate-limiter.
 * Bitta konteyner uchun yetarli. Bir nechta replika bo'lsa — Redis'ga o'tkaziladi.
 */
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  b.count++;
  if (b.count > limit) return { ok: false, remaining: 0, retryAfter: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, remaining: limit - b.count };
}
