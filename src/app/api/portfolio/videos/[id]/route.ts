import { mkdir, open, stat } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { editorProfiles, portfolioItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/current";
import { VIDEO } from "@/lib/constants";
import { env } from "@/lib/env";
import { getDict } from "@/lib/i18n";
import { rateLimit } from "@/lib/rate-limit";
import { deleteTmp, tmpDir, tmpPath } from "@/lib/uploads";
import { sniffVideo } from "@/lib/video-ffmpeg";
import { kickVideoWorker } from "@/lib/video-worker";

/**
 * Portfolio videosini bo'laklab yuklash: PUT /api/portfolio/videos/<id>?offset=<bayt>, tana — faylning keyingi bo'lagi.
 *
 *  - Har bir bo'lak (≤ VIDEO.chunkBytes) to'g'ridan-to'g'ri diskka yoziladi — server xotirasi to'lmaydi.
 *  - Bo'lak yoki to'liq yoziladi, yoki umuman yozilmaydi: uzilsa, brauzer shu bo'lakni qayta yuboradi.
 *  - offset serverdagi hajmga mos kelmasa — 409 va { received }: brauzer shu joydan davom etadi.
 *  - Oxirgi bo'lakdan keyin video siqish navbatiga qo'yiladi.
 */

const busy = new Set<string>();
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Boshqa saytdan yuborilgan so'rovlarni rad etish (cookie SameSite=Lax ustiga qo'shimcha himoya) */
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return host === req.headers.get("host") || host === new URL(env.appUrl).host;
  } catch {
    return false;
  }
}

async function sizeOf(file: string) {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const [d, user, { id }] = await Promise.all([getDict(), getCurrentUser(), ctx.params]);
  if (!sameOrigin(req)) return json(403, { message: d.errors.forbidden });
  if (!user) return json(401, { message: d.errors.unauthorized });
  if (!UUID_RE.test(id)) return json(404, { message: d.errors.notFound });
  if (!rateLimit(`video-chunk:${user.id}`, 240, 60_000).ok) return json(429, { message: d.errors.rateLimit });

  const offset = Number(new URL(req.url).searchParams.get("offset"));
  if (!Number.isSafeInteger(offset) || offset < 0) return json(400, { message: d.errors.validation });

  const [item] = await db
    .select({ status: portfolioItems.videoStatus, total: portfolioItems.uploadBytes })
    .from(portfolioItems)
    .innerJoin(editorProfiles, eq(editorProfiles.id, portfolioItems.editorId))
    .where(and(eq(portfolioItems.id, id), eq(editorProfiles.userId, user.id), eq(portfolioItems.provider, "upload")))
    .limit(1);
  if (!item || !item.total) return json(404, { message: d.errors.notFound });
  // Allaqachon to'liq yuklangan (masalan javob yo'lda yo'qolib, brauzer qayta yubordi)
  if (item.status !== "uploading") return json(200, { received: item.total, done: true });

  if (busy.has(id)) return json(429, { message: d.errors.rateLimit, busy: true });
  busy.add(id);
  try {
    const part = tmpPath(id, "part");
    await mkdir(tmpDir(), { recursive: true });
    const size = await sizeOf(part);
    if (offset !== size) return json(409, { received: size });

    const max = Math.min(VIDEO.chunkBytes, item.total - size);
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (max <= 0 || declared > max) return json(413, { message: d.errors.validation, received: size });
    if (!req.body) return json(400, { message: d.errors.validation, received: size });

    const fh = await open(part, "a");
    let written = 0;
    try {
      const reader = req.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        written += value.byteLength;
        if (written > max) {
          await reader.cancel().catch(() => {});
          throw new Error("chunk too large");
        }
        await fh.write(value);
      }
    } catch (e) {
      // Bo'lak to'liq kelmadi — yozilganini qaytarib kesamiz, brauzer shu bo'lakni qayta yuboradi
      await fh.truncate(size).catch(() => {});
      await fh.close();
      if (written > max) return json(413, { message: d.errors.validation, received: size });
      throw e;
    }
    await fh.close();
    if (written === 0) return json(400, { message: d.errors.validation, received: size });

    const received = size + written;
    if (received < item.total) return json(200, { received });

    // Oxirgi bo'lak: fayl haqiqatan video ekanini tekshirib, siqish navbatiga qo'yamiz
    if (!(await sniffVideo(part).catch(() => null))) {
      await db
        .update(portfolioItems)
        .set({ videoStatus: "failed", videoError: "invalid" })
        .where(and(eq(portfolioItems.id, id), eq(portfolioItems.videoStatus, "uploading")));
      await deleteTmp(id);
      return json(415, { message: d.errors.videoType });
    }
    await db
      .update(portfolioItems)
      .set({ videoStatus: "queued" })
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.videoStatus, "uploading")));
    kickVideoWorker();
    return json(200, { received, done: true });
  } finally {
    busy.delete(id);
  }
}
