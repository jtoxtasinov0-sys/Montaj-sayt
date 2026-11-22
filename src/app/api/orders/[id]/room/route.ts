import { getCurrentUser } from "@/lib/auth/current";
import { listFiles, listMessages, markRead, orderAccess } from "@/lib/order-room";

/**
 * Ochiq buyurtma sahifasi yangi xabar va fayllarni shu yerdan so'raydi (har CHAT.pollMs da, yashirin tabda kutadi).
 * GET /api/orders/<id>/room?after=<ISO vaqt> → { status, messages (after dan keyingilar), files (hammasi) }
 * Ochilgan xona "o'qilgan" deb belgilanadi.
 */
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([getCurrentUser(), ctx.params]);
  const headers = { "Cache-Control": "no-store" };
  if (!user || !UUID_RE.test(id)) return Response.json({ error: "not_found" }, { status: 404, headers });
  const acc = await orderAccess(id, user);
  if (!acc?.role) return Response.json({ error: "not_found" }, { status: 404, headers });

  const raw = new URL(req.url).searchParams.get("after");
  const after = raw ? new Date(raw) : undefined;
  const [messages, files] = await Promise.all([
    listMessages(id, after && !Number.isNaN(after.getTime()) ? after : undefined),
    listFiles(id),
  ]);
  if (messages.length) await markRead(id, acc.role);
  return Response.json({ status: acc.order.status, messages, files }, { headers });
}
