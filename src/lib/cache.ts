import "server-only";

/**
 * Kichik TTL kesh + bir xil so'rovlarni birlashtirish (thundering-herd himoyasi).
 * Ko'p o'qiladigan, kam o'zgaradigan ma'lumotlar uchun (tariflar, sozlamalar, TOP montajorlar).
 */
type Entry = { value: unknown; expires: number };
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const p = fn()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      if (store.size > 2000) {
        const oldest = store.keys().next().value;
        if (oldest) store.delete(oldest);
      }
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function invalidate(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
