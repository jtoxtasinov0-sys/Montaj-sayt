import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/current";
import { readUpload } from "@/lib/uploads";

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.join("/");
  const kind = path[0];

  let cache = "public, max-age=31536000, immutable";
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
