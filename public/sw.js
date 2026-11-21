/*
 * Montaj Club — service worker (PWA).
 *
 *  - Sahifalar (HTML) har doim internetdan olinadi: shaxsiy ma'lumotlar (kabinet, buyurtmalar) keshga TUSHMAYDI.
 *    Internet yo'q bo'lsa — /offline.html ko'rsatiladi.
 *  - /_next/static/* (nomida hash bor, hech qachon o'zgarmaydi) — keshdan: ilova ikkinchi ochilishda bir zumda yuklanadi.
 *  - Rasmlar, ikonkalar, muqova va avatarlar — keshdan darhol, orqada yangilanadi.
 *  - API, server action'lar (POST), videolar (Range so'rovlari) va boshqa domenlarga tegilmaydi.
 *
 * Yangi versiya chiqarganda VERSION ni oshiring — eski keshlar o'zi o'chadi.
 */
const VERSION = "v1";
const STATIC = `mc-static-${VERSION}`;
const ASSETS = `mc-assets-${VERSION}`;
const SHELL = `mc-shell-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png"];

const LIMIT = { [STATIC]: 400, [ASSETS]: 300 };
const ASSET_RE = /^\/(?:images\/|icon[^/]*$|apple-icon[^/]*$|favicon\.ico$|api\/files\/(?:covers|avatars)\/)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, ASSETS, SHELL]);
      for (const key of await caches.keys()) if (key.startsWith("mc-") && !keep.has(key)) await caches.delete(key);
      // Sahifa so'rovi service worker ishga tushishini kutmasdan darhol yuboriladi
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(page(event));
    return;
  }
  if (req.headers.has("range")) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event, STATIC));
    return;
  }
  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, ASSETS));
  }
});

async function page(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload) return preload;
    return await fetch(event.request);
  } catch {
    const cached = await caches.match(OFFLINE_URL, { cacheName: SHELL });
    return cached || Response.error();
  }
}

const cacheable = (res) => res && res.ok && res.type === "basic" && !res.headers.get("cache-control")?.includes("no-store");

async function put(cacheName, req, res) {
  if (!cacheable(res)) return;
  const cache = await caches.open(cacheName);
  await cache.put(req, res);
  const keys = await cache.keys();
  const extra = keys.length - (LIMIT[cacheName] ?? 200);
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}

async function cacheFirst(event, cacheName) {
  const cached = await caches.match(event.request, { cacheName });
  if (cached) return cached;
  const res = await fetch(event.request);
  event.waitUntil(put(cacheName, event.request, res.clone()).catch(() => {}));
  return res;
}

async function staleWhileRevalidate(event, cacheName) {
  const cached = await caches.match(event.request, { cacheName });
  const network = fetch(event.request).then((res) => {
    event.waitUntil(put(cacheName, event.request, res.clone()).catch(() => {}));
    return res;
  });
  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}
