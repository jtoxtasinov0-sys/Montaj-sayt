import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { portfolioItems } from "@/db/schema";
import { invalidate } from "@/lib/cache";
import { VIDEO } from "@/lib/constants";
import { deleteTmp, deleteUpload, saveImageBuffer, tmpDir, tmpPath, uploadPath } from "@/lib/uploads";
import { grabPoster, probeVideo, sniffVideo, transcodeVideo } from "@/lib/video-ffmpeg";

/**
 * Video siqish navbati (bazadagi portfolio_items.video_status orqali).
 *
 *  - Faqat BITTA jarayonda ishlaydi (instrumentation.ts: WORKER_INDEX=0) va videolarni birma-bir siqadi,
 *    shuning uchun 50 kishi bir vaqtda yuklasa ham CPU band bo'lib sayt sekinlashmaydi — ular navbatda turadi.
 *  - Navbat bazada: server qayta ishga tushsa ham hech narsa yo'qolmaydi.
 *  - Yarim yo'lda qolgan (qulagan) ish 10 daqiqadan keyin qayta olinadi, 3 urinishdan keyin "failed".
 */

const POLL_MS = 4_000;
const CLEANUP_MS = 10 * 60_000;
const MAX_ATTEMPTS = 3;

type Job = { id: string; attempts: number; cover_key: string | null };

declare global {
  // eslint-disable-next-line no-var
  var __videoWorker: { kick: () => void } | undefined;
}

export function startVideoWorker() {
  if (globalThis.__videoWorker) return;
  let busy = false;
  let again = false;
  let lastCleanup = 0;

  const tick = async () => {
    if (busy) {
      again = true;
      return;
    }
    busy = true;
    try {
      do {
        again = false;
        for (let job = await claim(); job; job = await claim()) await processJob(job);
        if (Date.now() - lastCleanup > CLEANUP_MS) {
          lastCleanup = Date.now();
          await cleanup();
        }
      } while (again);
    } catch (e) {
      console.error("[video] worker error:", e);
    } finally {
      busy = false;
    }
  };

  setInterval(tick, POLL_MS).unref();
  globalThis.__videoWorker = { kick: () => void tick() };
  console.log("[video] worker started");
}

/** Yuklash tugaganda chaqiriladi: shu jarayonda ishchi bo'lsa — darhol boshlaydi, bo'lmasa u POLL_MS ichida o'zi topadi */
export function kickVideoWorker() {
  globalThis.__videoWorker?.kick();
}

async function claim(): Promise<Job | null> {
  const rows = await db.execute<Job>(sql`
    UPDATE portfolio_items
       SET video_status = 'processing', processing_at = now(), attempts = attempts + 1
     WHERE id = (
       SELECT id FROM portfolio_items
        WHERE video_status = 'queued'
           OR (video_status = 'processing' AND processing_at < now() - interval '10 minutes')
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
     )
    RETURNING id, attempts, cover_key`);
  return rows[0] ?? null;
}

async function fail(id: string, code: "duration" | "invalid" | "transcode") {
  await db
    .update(portfolioItems)
    .set({ videoStatus: "failed", videoError: code, processingAt: null })
    .where(eq(portfolioItems.id, id));
  await deleteTmp(id);
}

async function processJob(job: Job) {
  const { id } = job;
  const started = Date.now();
  if (job.attempts > MAX_ATTEMPTS) return fail(id, "transcode");
  const src = tmpPath(id, "part");
  const out = tmpPath(id, "mp4");
  let videoKey: string | null = null;
  let posterKey: string | null = null;
  try {
    const container = await sniffVideo(src).catch(() => null);
    if (!container) return fail(id, "invalid");
    const info = await probeVideo(src, container);
    if (!info) return fail(id, "invalid");
    if (info.duration > VIDEO.maxSeconds + 1) return fail(id, "duration");

    await transcodeVideo(src, container, out);
    const res = await probeVideo(out, "mov");
    if (!res) return fail(id, "transcode");

    videoKey = `videos/${randomUUID()}.mp4`;
    await mkdir(path.dirname(uploadPath(videoKey)), { recursive: true });
    await rename(out, uploadPath(videoKey));

    // Montajor muqova yuklamagan bo'lsa (yuklashda yoki keyin "Muqovani almashtirish" orqali) — videoning o'zidan kadr olamiz
    if (!job.cover_key) {
      const png = await grabPoster(uploadPath(videoKey), res.duration).catch(() => null);
      if (png) posterKey = await saveImageBuffer(png, "covers").catch(() => null);
    }

    const [row] = await db
      .update(portfolioItems)
      .set({
        videoStatus: "ready",
        videoKey,
        url: `/api/files/${videoKey}`,
        durationSec: Math.round(res.duration * 10) / 10,
        width: res.width,
        height: res.height,
        // Siqish paytida montajor o'zi muqova qo'ygan bo'lsa — uniki qoladi, avtomatik kadr kerak emas
        ...(posterKey && { coverKey: sql`coalesce(${portfolioItems.coverKey}, ${posterKey})` }),
        videoError: null,
        processingAt: null,
      })
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.videoStatus, "processing")))
      .returning({ id: portfolioItems.id, coverKey: portfolioItems.coverKey });

    await deleteTmp(id);
    if (!row) {
      // Siqish paytida montajor videoni o'chirib yuborgan
      await deleteUpload(videoKey);
      await deleteUpload(posterKey);
      return;
    }
    if (posterKey && row.coverKey !== posterKey) await deleteUpload(posterKey);
    invalidate("editors:");
    const mb = ((await stat(uploadPath(videoKey)).catch(() => ({ size: 0 }))).size / 1048576).toFixed(1);
    console.log(`[video] ${id} ready: ${res.width}x${res.height}, ${res.duration.toFixed(1)}s, ${mb} MB, ${Date.now() - started}ms`);
  } catch (e) {
    console.error(`[video] ${id} failed (attempt ${job.attempts}):`, e);
    await deleteUpload(videoKey);
    await deleteUpload(posterKey);
    await rm(out, { force: true });
    if (job.attempts >= MAX_ATTEMPTS) await fail(id, "transcode");
    else
      await db
        .update(portfolioItems)
        .set({ videoStatus: "queued", processingAt: null })
        .where(and(eq(portfolioItems.id, id), eq(portfolioItems.videoStatus, "processing")));
  }
}

/** Tashlab ketilgan yuklashlar (6 soatdan eski) va egasiz vaqtinchalik fayllarni tozalash */
async function cleanup() {
  const stale = await db
    .delete(portfolioItems)
    .where(and(eq(portfolioItems.videoStatus, "uploading"), sql`${portfolioItems.createdAt} < now() - interval '6 hours'`))
    .returning({ id: portfolioItems.id });
  for (const r of stale) await deleteTmp(r.id);

  let files: string[] = [];
  try {
    files = await readdir(tmpDir());
  } catch {
    return;
  }
  const dayAgo = Date.now() - 24 * 3_600_000;
  const old: { id: string; file: string }[] = [];
  for (const f of files) {
    const m = /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.(part|mp4)$/.exec(f);
    const full = path.join(tmpDir(), f);
    const st = await stat(full).catch(() => null);
    if (!st || st.mtimeMs > dayAgo) continue;
    if (!m) await rm(full, { force: true });
    else old.push({ id: m[1], file: full });
  }
  if (!old.length) return;
  const active = await db
    .select({ id: portfolioItems.id })
    .from(portfolioItems)
    .where(
      and(
        inArray(
          portfolioItems.id,
          old.map((o) => o.id),
        ),
        inArray(portfolioItems.videoStatus, ["uploading", "queued", "processing"]),
      ),
    );
  const keep = new Set(active.map((a) => a.id));
  for (const o of old) if (!keep.has(o.id)) await rm(o.file, { force: true });
}
