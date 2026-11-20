import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { getClientIp } from "@/lib/ip";
import { expireStalePayments, matchIncoming, parseAmounts } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Bank xabarini qabul qilish (avtomatik to'lov tasdiqlash).
 * Telefondagi SMS forwarder ilovasi kartaga pul tushgani haqidagi SMS'ni shu yerga yuboradi.
 * Kalit: `X-Payment-Secret` sarlavhasida yoki `?key=` da (ba'zi ilovalar faqat manzil qabul qiladi).
 * Tana: JSON (`{"text": "..."}`, `{"message": "..."}`, `{"amount": 40437}` — istalgan matn maydonlari), forma yoki oddiy matn.
 */
function validKey(given: string | null) {
  const expected = env.paymentWebhookSecret;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** JSON ichidagi barcha matn va raqamlarni bitta matnga yig'ish (ilovalar maydon nomini har xil qo'yadi) */
function collect(v: unknown, out: string[], depth = 0) {
  if (depth > 4 || out.length > 50) return;
  if (typeof v === "string") out.push(v);
  else if (typeof v === "number" && Number.isFinite(v)) out.push(String(Math.trunc(v)));
  else if (Array.isArray(v)) v.forEach((x) => collect(x, out, depth + 1));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collect(x, out, depth + 1));
}

export async function POST(req: Request) {
  const ip = await getClientIp();
  if (!rateLimit(`incoming:${ip}`, 60, 60_000).ok) return NextResponse.json({ ok: false, error: "rate" }, { status: 429 });
  const url = new URL(req.url);
  if (!validKey(req.headers.get("x-payment-secret") ?? url.searchParams.get("key"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const raw = (await req.text()).slice(0, 5000);
  const parts: string[] = [];
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("json")) {
    try {
      collect(JSON.parse(raw), parts);
    } catch {
      parts.push(raw);
    }
  } else if (type.includes("x-www-form-urlencoded")) {
    for (const [, v] of new URLSearchParams(raw)) parts.push(v);
  } else {
    parts.push(raw);
  }
  const text = parts.join("\n");

  await expireStalePayments();
  const amounts = parseAmounts(text);
  const matched = await matchIncoming(amounts, "webhook", text);
  if (matched.length) {
    await audit({ actorLabel: "avto:webhook", action: "payment.auto", targetType: "payment", targetId: matched[0].paymentId, ip });
  }
  return NextResponse.json({ ok: true, amounts, matched: matched.map((m) => ({ id: m.paymentId, amount: m.amount })) });
}
