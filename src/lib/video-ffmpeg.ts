import "server-only";
import { spawn } from "node:child_process";
import { open } from "node:fs/promises";
import { setPriority } from "node:os";
import { VIDEO } from "@/lib/constants";

/**
 * ffmpeg/ffprobe bilan ishlash: yuklangan videoni tekshirish, 720p MP4 ga siqish va muqova kadrini olish.
 * Foydalanuvchi faylidagi baytlar hech qachon to'g'ridan-to'g'ri ko'rsatilmaydi — har doim qayta kodlanadi.
 */

export type VideoContainer = "mov" | "matroska";

/** "Magic bytes": MP4/MOV (ftyp, moov…) yoki WEBM/MKV (EBML). Kengaytmaga emas, mazmunga ishonamiz. */
export async function sniffVideo(file: string): Promise<VideoContainer | null> {
  const fh = await open(file, "r");
  try {
    const buf = Buffer.alloc(12);
    const { bytesRead } = await fh.read(buf, 0, 12, 0);
    if (bytesRead < 12) return null;
    const box = buf.subarray(4, 8).toString("latin1");
    if (["ftyp", "moov", "mdat", "free", "wide", "skip"].includes(box)) return "mov";
    if (buf.readUInt32BE(0) === 0x1a45dfa3) return "matroska";
    return null;
  } finally {
    await fh.close();
  }
}

type RunResult = { code: number | null; stdout: Buffer; stderr: string };

/** Jarayonni vaqt chegarasi bilan ishga tushiradi. Past ustuvorlik: sayt so'rovlari doim oldinda turadi. */
function run(cmd: string, args: string[], timeoutMs: number, maxStdout = 16 * 1024 * 1024): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    if (child.pid) {
      try {
        // 19 — eng past: sayt band bo'lganda ffmpeg CPU ni deyarli olmaydi (15 da ~15% olardi), bo'sh paytda to'liq ishlaydi
        setPriority(child.pid, 19);
      } catch {}
    }
    const out: Buffer[] = [];
    let outLen = 0;
    let err = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (c: Buffer) => {
      outLen += c.length;
      if (outLen <= maxStdout) out.push(c);
      else child.kill("SIGKILL");
    });
    child.stderr.on("data", (c: Buffer) => {
      if (err.length < 8000) err += c.toString();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: Buffer.concat(out), stderr: err });
    });
  });
}

// Faqat lokal fayl, va format aniq ko'rsatiladi — HLS/concat kabi tashqi manbaga murojaat qiluvchi demuxerlar ishlamaydi
const inputArgs = (file: string, container: VideoContainer) => ["-protocol_whitelist", "file", "-f", container, "-i", file];

export type ProbeInfo = { duration: number; width: number; height: number };

export async function probeVideo(file: string, container: VideoContainer): Promise<ProbeInfo | null> {
  const r = await run(
    "ffprobe",
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", ...inputArgs(file, container)],
    30_000,
  );
  if (r.code !== 0) return null;
  try {
    const j = JSON.parse(r.stdout.toString()) as {
      format?: { duration?: string };
      streams?: { codec_type?: string; width?: number; height?: number; duration?: string }[];
    };
    const v = j.streams?.find((s) => s.codec_type === "video" && (s.width ?? 0) > 0);
    if (!v) return null;
    const duration = Number(j.format?.duration ?? v.duration);
    if (!Number.isFinite(duration) || duration <= 0) return null;
    return { duration, width: v.width ?? 0, height: v.height ?? 0 };
  } catch {
    return null;
  }
}

/**
 * 720p (uzun tomoni VIDEO.maxSide) H.264 + AAC, 30 fps gacha, "faststart" (o'ynash darhol boshlanadi).
 * Telefon videolaridagi burilish avtomatik to'g'rilanadi, metadata (GPS va h.k.) o'chiriladi.
 */
export async function transcodeVideo(src: string, container: VideoContainer, dest: string) {
  const side = VIDEO.maxSide;
  const scale =
    `scale=w='if(gte(iw,ih),min(${side},trunc(iw/2)*2),-2)':h='if(gte(iw,ih),-2,min(${side},trunc(ih/2)*2))',` +
    "setsar=1,format=yuv420p";
  const r = await run(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostdin",
      "-loglevel",
      "error",
      "-y",
      ...inputArgs(src, container),
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-sn",
      "-dn",
      "-map_metadata",
      "-1",
      "-map_chapters",
      "-1",
      "-t",
      String(VIDEO.maxSeconds + 1),
      "-vf",
      scale,
      "-fpsmax",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-maxrate",
      "3M",
      "-bufsize",
      "6M",
      "-profile:v",
      "high",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-ar",
      "48000",
      "-threads",
      "2",
      "-movflags",
      "+faststart",
      "-f",
      "mp4",
      dest,
    ],
    8 * 60_000,
    1024 * 1024,
  );
  if (r.code !== 0) throw new Error(`ffmpeg failed (${r.code}): ${r.stderr.slice(-500)}`);
}

/** Videodan muqova uchun eng "tipik" kadrni PNG ko'rinishida oladi (boshidagi qora/fade kadrlardan qochib) */
export async function grabPoster(file: string, duration: number): Promise<Buffer | null> {
  const at = Math.max(0, Math.min(duration * 0.3, duration - 1.5)).toFixed(2);
  const r = await run(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostdin",
      "-loglevel",
      "error",
      "-ss",
      at,
      ...inputArgs(file, "mov"),
      "-vf",
      "thumbnail=24",
      "-frames:v",
      "1",
      "-f",
      "image2pipe",
      "-c:v",
      "png",
      "-",
    ],
    60_000,
  );
  return r.code === 0 && r.stdout.length > 0 ? r.stdout : null;
}
