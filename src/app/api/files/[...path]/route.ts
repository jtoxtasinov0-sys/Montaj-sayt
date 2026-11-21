import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/current";
import { isValidKey, readUpload, uploadPath } from "@/lib/uploads";

const IMMUTABLE = "public, max-age=31536000, immutable";

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.join("/");
  const kind = path[0];

  if (kind === "videos") return serveVideo(req, key);

  let cache = IMMUTABLE;
  if (kind === "receipts") {
    // To'lov cheklari maxfiy: faqat admin yoki to'lov egasi ko'radi
    const user = await getCurrentUser();
    if (!user) return new Response("Not found", { status: 404 });
    if (user.role !== "ADMIN") {
      const own = await db
        .select({ id: payments.id })
        .from(payments)
        .where(and(eq(payments.receiptKey, key), eq(payments.userId, user.id)))
        .limit(1);
      if (!own.length) return new Response("Not found", { status: 404 });
    }
    cache = "private, no-store";
  }

  const buf = await readUpload(key);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(buf.length),
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}

/**
 * Portfolio videosi: diskdan oqim bilan (butun fayl xotiraga o'qilmaydi) va Range so'rovlari bilan —
 * brauzer faqat ko'rilayotgan qismini yuklaydi, oldinga o'tkazish (seek) darhol ishlaydi.
 * Fayl nomi tasodifiy va o'zgarmaydi, shuning uchun brauzer/CDN uni bir yil keshlaydi.
 */
async function serveVideo(req: Request, key: string) {
  if (!isValidKey(key)) return new Response("Not found", { status: 404 });
  const file = uploadPath(key);
  const st = await stat(file).catch(() => null);
  if (!st?.isFile()) return new Response("Not found", { status: 404 });

  const size = st.size;
  const etag = `"${size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": IMMUTABLE,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  let start = 0;
  let end = size - 1;
  let status = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range")?.trim() ?? "");
  if (m && (m[1] || m[2])) {
    if (m[1]) {
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    } else {
      start = Math.max(0, size - Number(m[2]));
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(end - start + 1);

  const stream = createReadStream(file, { start, end, highWaterMark: 256 * 1024 });
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status, headers });
}
