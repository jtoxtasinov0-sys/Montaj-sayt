import "server-only";

/**
 * Kichik TTL kesh + bir xil so'rovlarni birlashtirish (thundering-herd himoyasi).
 * Ko'p o'qiladigan, kam o'zgaradigan ma'lumotlar uchun (tariflar, sozlamalar, TOP montajorlar).
 *
 * server-cluster.cjs bilan har bir CPU yadrosida alohida jarayon ishlaydi va har birining keshi o'zida.
 * Shuning uchun invalidate() boshqa ishchilarga ham yuboriladi (primary orqali), aks holda admin tarif yoki
 * kartani o'zgartirganda boshqa ishchi eski qiymatni TTL tugaguncha (5 daqiqagacha) ko'rsatib turardi.
 */
type Entry = { value: unknown; expires: number };
type State = { store: Map<string, Entry>; inflight: Map<string, Promise<unknown>>; ipc: boolean };

const IPC_TYPE = "mc:cache-invalidate";

declare global {
  // eslint-disable-next-line no-var
  var __mcCache: State | undefined;
}

// Bitta jarayonda modul bir necha marta yuklansa ham kesh bitta bo'lsin
const state: State = (globalThis.__mcCache ??= { store: new Map(), inflight: new Map(), ipc: false });
const { store, inflight } = state;

/** Faqat server-cluster.cjs ishchisida (WORKER_INDEX qo'yiladi) IPC kanali bor */
const inCluster = process.env.WORKER_INDEX !== undefined && typeof process.send === "function";

if (inCluster && !state.ipc) {
  state.ipc = true;
  process.on("message", (msg: unknown) => {
    const m = msg as { type?: unknown; prefix?: unknown } | null;
    if (m && m.type === IPC_TYPE && typeof m.prefix === "string") dropLocal(m.prefix);
  });
}

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const p: Promise<T> = fn()
    .then((value) => {
      // So'rov davomida invalidate() bo'lgan bo'lsa — eski natijani keshga yozmaymiz
      if (inflight.get(key) === p) {
        store.set(key, { value, expires: Date.now() + ttlMs });
        if (store.size > 2000) {
          const oldest = store.keys().next().value;
          if (oldest) store.delete(oldest);
        }
      }
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

function dropLocal(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
  for (const k of inflight.keys()) if (k.startsWith(prefix)) inflight.delete(k);
}

export function invalidate(prefix: string) {
  dropLocal(prefix);
  if (inCluster) {
    try {
      process.send!({ type: IPC_TYPE, prefix });
    } catch {
      // primary bilan aloqa uzilgan (qayta ishga tushish paytida) — mahalliy kesh baribir tozalandi
    }
  }
}
