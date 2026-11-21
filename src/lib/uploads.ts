import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { LIMITS } from "@/lib/constants";
import { env } from "@/lib/env";

export const UPLOAD_KINDS = ["avatars", "covers", "receipts"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

const MAX_SIDE: Record<UploadKind, number> = { avatars: 512, covers: 1280, receipts: 1800 };
// Rasmlar (.webp) va portfolio videolari (videos/uuid.mp4 — har doim serverda qayta kodlangan)
const KEY_RE = /^(?:(?:avatars|covers|receipts)\/[a-f0-9-]{36}\.webp|videos\/[a-f0-9-]{36}\.mp4)$/;

export class UploadError extends Error {
  constructor(public code: "uploadType" | "uploadSize" | "uploadRequired") {
    super(code);
  }
}

function sniffImage(buf: Buffer) {
  // "magic bytes" — fayl kengaytmasiga emas, mazmuniga ishonamiz
  if (buf.length < 12) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

/**
 * Rasmni tekshiradi, qayta kodlaydi (EXIF/metadata o'chadi, zararli payload yo'qoladi) va WEBP sifatida saqlaydi.
 * Qaytaradi: "kind/uuid.webp" kalit.
 */
export async function saveImage(file: File | null | undefined, kind: UploadKind, required = false): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) {
    if (required) throw new UploadError("uploadRequired");
    return null;
  }
  if (file.size > LIMITS.uploadBytes) throw new UploadError("uploadSize");
  return saveImageBuffer(Buffer.from(await file.arrayBuffer()), kind);
}

/** Xotiradagi rasmni (masalan videodan olingan kadr) tekshirib, WEBP qilib saqlaydi. */
export async function saveImageBuffer(buf: Buffer, kind: UploadKind): Promise<string> {
  if (!sniffImage(buf)) throw new UploadError("uploadType");

  let out: Buffer;
  try {
    out = await sharp(buf, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({ width: MAX_SIDE[kind], height: MAX_SIDE[kind], fit: "inside", withoutEnlargement: true })
      .webp({ quality: kind === "receipts" ? 85 : 80 })
      .toBuffer();
  } catch {
    throw new UploadError("uploadType");
  }

  const key = `${kind}/${randomUUID()}.webp`;
  const dest = path.join(env.uploadDir, key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, out);
  return key;
}

export function isValidKey(key: string) {
  return KEY_RE.test(key);
}

/** Kalit bo'yicha diskdagi to'liq yo'l (kalit tekshirilgan bo'lishi shart) */
export function uploadPath(key: string) {
  if (!isValidKey(key)) throw new Error("bad upload key");
  return path.join(env.uploadDir, key);
}

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** Yuklanayotgan video bo'laklari va siqish jarayonidagi vaqtinchalik fayllar papkasi */
export const tmpDir = () => path.join(env.uploadDir, "tmp");

/** Portfolio elementi id si bo'yicha vaqtinchalik fayl: ".part" — yuklanayotgan asl fayl, ".mp4" — siqilayotgan natija */
export function tmpPath(id: string, ext: "part" | "mp4") {
  if (!UUID_RE.test(id)) throw new Error("bad id");
  return path.join(tmpDir(), `${id}.${ext}`);
}

export async function deleteTmp(id: string) {
  await Promise.all([rm(tmpPath(id, "part"), { force: true }), rm(tmpPath(id, "mp4"), { force: true })]);
}

export async function readUpload(key: string) {
  if (!isValidKey(key)) return null;
  try {
    return await readFile(path.join(env.uploadDir, key));
  } catch {
    return null;
  }
}

export async function deleteUpload(key: string | null | undefined) {
  if (!key || !isValidKey(key)) return;
  await unlink(path.join(env.uploadDir, key)).catch(() => {});
}
