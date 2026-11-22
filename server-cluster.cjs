/**
 * Production ishga tushiruvchi: barcha CPU yadrolaridan foydalanish + mehmonlar uchun mikro-kesh.
 *
 *  - Primary jarayon: 0.0.0.0:PORT da tinglaydi, so'rovlarni ishchilarga (Next.js) taqsimlaydi.
 *  - Ishchilar: har biri Next.js standalone serveri (127.0.0.1:WORKER_BASE_PORT+i).
 *  - Mikro-kesh: tizimga KIRMAGAN foydalanuvchilarning ochiq sahifalari (/, /editors, /jobs ...)
 *    MICROCACHE_TTL_MS (standart 10 soniya) davomida xotirada saqlanadi. Bir xil sahifaga bir vaqtda
 *    kelgan 1000 so'rov uchun Next faqat 1 marta render qiladi. Kirgan foydalanuvchilar, POST, API — keshlanmaydi.
 *  - Ishchi qulasa — avtomatik qayta ishga tushiriladi.
 *
 * Sozlamalar: WEB_CONCURRENCY (ishchilar soni, standart = CPU soni), MICROCACHE_TTL_MS (0 = o'chirilgan).
 */
const cluster = require("node:cluster");
const http = require("node:http");
const os = require("node:os");

const PORT = Number(process.env.PORT || 3000);
const LISTEN_HOST = process.env.LISTEN_HOST || "0.0.0.0";
const BASE = Number(process.env.WORKER_BASE_PORT || 3100);
const WORKERS = Math.max(1, Number(process.env.WEB_CONCURRENCY) || (os.availableParallelism ? os.availableParallelism() : os.cpus().length));
const TTL = Number(process.env.MICROCACHE_TTL_MS ?? 10_000);
const MAX_ENTRIES = 1000;
const MAX_BODY = 3 * 1024 * 1024;

if (!cluster.isPrimary) {
  require("./server.js");
  return;
}

// ---------------- ishchilar ----------------
const ready = new Set();
function fork(i) {
  const w = cluster.fork({
    PORT: String(BASE + i),
    HOSTNAME: "127.0.0.1",
    WORKER_INDEX: String(i),
    // Next standart 5 s dan keyin bo'sh ulanishni yopadi. Yuklama ostida u biz shu ulanishga yangi so'rov
    // yuborayotgan paytda yopilib qolishi mumkin (ECONNRESET → foydalanuvchiga 502). Uzunroq muddat bu poygani yo'qotadi;
    // agent esa "Keep-Alive: timeout=75" ni ko'rib, ulanishni ishchidan 1 s oldin o'zi yopadi.
    KEEP_ALIVE_TIMEOUT: process.env.KEEP_ALIVE_TIMEOUT || "75000",
  });
  w.idx = i;
}
for (let i = 0; i < WORKERS; i++) fork(i);
cluster.on("listening", (w) => {
  ready.add(w.idx);
  console.log(`[cluster] worker ${w.idx} ready on 127.0.0.1:${BASE + w.idx}`);
});
let shuttingDown = false;
cluster.on("exit", (w, code, signal) => {
  ready.delete(w.idx);
  if (shuttingDown) return;
  console.error(`[cluster] worker ${w.idx} exited (${signal || code}) — restarting`);
  setTimeout(() => fork(w.idx), 1000);
});

// Bir ishchida kesh tozalansa (src/lib/cache.ts → invalidate) — qolgan ishchilarga ham yetkazamiz
cluster.on("message", (from, msg) => {
  if (!msg || msg.type !== "mc:cache-invalidate" || typeof msg.prefix !== "string") return;
  for (const id in cluster.workers) {
    const w = cluster.workers[id];
    if (w && w !== from && w.isConnected()) w.send(msg, (err) => err && console.error("[cluster] invalidate relay:", err.message));
  }
});

let rr = 0;
function pickPort() {
  const list = [...ready];
  if (!list.length) return null;
  rr = (rr + 1) % list.length;
  return BASE + list[rr];
}

// ---------------- mikro-kesh ----------------
const cache = new Map(); // key -> { status, headers, body, expires }
const inflight = new Map(); // key -> [{ req, res }]
const PUBLIC_PATH = /^\/(?:|editors|editors\/[a-z0-9-]{3,40}|jobs|terms|privacy)$/;
const SESSION_COOKIE = /(?:^|;\s*)(?:__Host-)?mh_session=/;
const HOP = new Set(["connection", "keep-alive", "transfer-encoding", "content-length", "date", "proxy-connection", "upgrade"]);

function cacheKey(req) {
  if (TTL <= 0 || req.method !== "GET") return null;
  const h = req.headers;
  if (h.rsc || h["next-action"] || h["next-router-prefetch"] || h["next-router-state-tree"] || h.authorization) return null;
  const cookie = h.cookie || "";
  if (SESSION_COOKIE.test(cookie)) return null;
  const [pathname, query = ""] = req.url.split("?");
  if (!PUBLIC_PATH.test(pathname) || query.includes("_rsc=") || req.url.length > 300) return null;
  const lang = (cookie.match(/(?:^|;\s*)lang=(uz|ru|en)\b/) || [])[1] || "uz";
  const theme = /(?:^|;\s*)theme=light\b/.test(cookie) ? "light" : "dark";
  const enc = /\bgzip\b/.test(h["accept-encoding"] || "") ? "gzip" : "identity";
  return `${h.host}|${req.url}|${lang}|${theme}|${enc}`;
}

function serveEntry(res, e, tag) {
  res.writeHead(e.status, { ...e.headers, "content-length": e.body.length, "x-cache": tag });
  res.end(e.body);
}

function sweep() {
  const now = Date.now();
  for (const [k, e] of cache) if (e.expires <= now) cache.delete(k);
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
}
setInterval(sweep, 30_000).unref();

const agent = new http.Agent({ keepAlive: true, maxSockets: 512, keepAliveMsecs: 10_000 });

function badGateway(res) {
  if (res.headersSent) return res.destroy();
  res.writeHead(502, { "content-type": "text/plain; charset=utf-8", "retry-after": "2" });
  res.end("Server qayta ishga tushmoqda, birozdan so'ng urinib ko'ring.");
}

const IDEMPOTENT = new Set(["GET", "HEAD"]);
/** Tanasiz GET/HEAD — xavfsiz qayta yuboriladi va pipe'siz yakunlanadi */
const bodyless = (req) =>
  IDEMPOTENT.has(req.method) && !req.headers["transfer-encoding"] && (!req.headers["content-length"] || req.headers["content-length"] === "0");

function forward(req, res, key, attempt = 0) {
  const port = pickPort();
  if (!port) {
    badGateway(res);
    releaseWaiters(key, null);
    return;
  }
  const headers = { ...req.headers };
  // Traefik X-Real-IP qo'yadi; to'g'ridan-to'g'ri ulanishda — socket manzili
  if (!headers["x-real-ip"] && !headers["x-forwarded-for"]) headers["x-real-ip"] = req.socket.remoteAddress || "";

  let clientGone = false;
  const preq = http.request({ host: "127.0.0.1", port, method: req.method, path: req.url, headers, agent }, (pres) => {
    const storable = key && pres.statusCode === 200 && !pres.headers["set-cookie"];
    const outHeaders = {};
    for (const [k, v] of Object.entries(pres.headers)) if (!HOP.has(k)) outHeaders[k] = v;
    res.writeHead(pres.statusCode || 502, { ...pres.headers, ...(key ? { "x-cache": "MISS" } : {}) });
    const chunks = [];
    let size = 0;
    pres.on("data", (c) => {
      if (storable && size <= MAX_BODY) {
        chunks.push(c);
        size += c.length;
      }
      if (!res.destroyed) res.write(c);
    });
    pres.on("end", () => {
      res.end();
      if (storable && size <= MAX_BODY) {
        const entry = { status: 200, headers: outHeaders, body: Buffer.concat(chunks), expires: Date.now() + TTL };
        cache.set(key, entry);
        releaseWaiters(key, entry);
      } else releaseWaiters(key, null);
    });
    pres.on("error", () => {
      res.destroy();
      releaseWaiters(key, null);
    });
  });
  preq.setTimeout(60_000, () => preq.destroy(new Error("upstream timeout")));
  preq.on("error", (e) => {
    // Qayta ishlatilgan ulanishni ishchi yopib qo'ygan — GET/HEAD ni boshqa ulanish orqali bir marta qayta yuboramiz
    // (javob hali boshlanmagan, so'rov tanasi yo'q, takrorlash xavfsiz). Foydalanuvchi buni sezmaydi.
    if (!clientGone && attempt === 0 && preq.reusedSocket && e.code === "ECONNRESET" && !res.headersSent && bodyless(req)) {
      return forward(req, res, key, 1);
    }
    if (!clientGone) console.error(`[cluster] upstream ${e.code || e.message}: ${req.method} ${req.url.split("?")[0]}`);
    badGateway(res);
    releaseWaiters(key, null);
  });
  // mijoz uzilsa: keshlanadigan so'rovni oxirigacha o'qiymiz (boshqalar kutayotgan bo'lishi mumkin)
  res.on("close", () => {
    if (res.writableFinished) return;
    clientGone = true;
    if (!key) preq.destroy();
  });
  if (bodyless(req)) {
    // tanasiz so'rov: pipe o'rniga darhol yakunlaymiz — qayta yuborishda ham ishlaydi (req allaqachon o'qilgan bo'ladi)
    preq.end();
    req.resume();
  } else req.pipe(preq);
}

function releaseWaiters(key, entry) {
  if (!key) return;
  const waiters = inflight.get(key);
  inflight.delete(key);
  if (!waiters) return;
  for (const w of waiters) {
    if (entry) serveEntry(w.res, entry, "HIT");
    else forward(w.req, w.res, null);
  }
}

const server = http.createServer((req, res) => {
  const key = cacheKey(req);
  if (key) {
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return serveEntry(res, hit, "HIT");
    const waiting = inflight.get(key);
    if (waiting) {
      waiting.push({ req, res }); // bir xil sahifa allaqachon render qilinmoqda — natijani kutamiz
      return;
    }
    inflight.set(key, []);
  }
  forward(req, res, key);
});
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 120_000;

server.on("error", (e) => {
  console.error("[cluster] server error:", e.message);
  shutdown();
});
server.listen(PORT, LISTEN_HOST, () => {
  console.log(`[cluster] primary on ${LISTEN_HOST}:${PORT} · ${WORKERS} workers · microcache ${TTL > 0 ? `${TTL}ms` : "off"}`);
});

function shutdown() {
  shuttingDown = true;
  server.close();
  for (const id in cluster.workers) cluster.workers[id]?.process.kill("SIGTERM");
  setTimeout(() => process.exit(0), 8000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
