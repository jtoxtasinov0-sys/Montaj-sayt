import "server-only";
import type { ActionState } from "@/lib/action-types";
import { getCurrentUser, type SessionUser } from "@/lib/auth/current";
import { getDict, type Dict } from "@/lib/i18n";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { UploadError } from "@/lib/uploads";

export const ok = (message: string): ActionState => ({ ok: true, message, at: Date.now() });
export const fail = (message: string): ActionState => ({ ok: false, message, at: Date.now() });

type Ctx = { user: SessionUser; d: Dict; ip: string };

/**
 * Har bir server action uchun umumiy himoya: login tekshiruvi + rate-limit + xatolarni ushlash.
 * Xato tafsilotlari foydalanuvchiga ko'rsatilmaydi (faqat log'ga yoziladi).
 */
export async function guarded(
  opts: { key: string; limit?: number; windowMs?: number; admin?: boolean },
  fn: (c: Ctx) => Promise<ActionState>,
): Promise<ActionState> {
  const [user, d, ip] = await Promise.all([getCurrentUser(), getDict(), getClientIp()]);
  if (!user) return fail(d.errors.unauthorized);
  if (opts.admin && user.role !== "ADMIN") return fail(d.errors.forbidden);
  const rl = rateLimit(`${opts.key}:${user.id}`, opts.limit ?? 30, opts.windowMs ?? 60_000);
  const rlIp = rateLimit(`ip:${ip}`, 300, 60_000);
  if (!rl.ok || !rlIp.ok) return fail(d.errors.rateLimit);
  try {
    return await fn({ user, d, ip });
  } catch (e) {
    if (e instanceof UploadError) return fail(d.errors[e.code]);
    // Next.js redirect()/notFound() xatolarini o'tkazib yuborish
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    console.error(`[action:${opts.key}]`, e);
    return fail(d.errors.generic);
  }
}

export function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function file(fd: FormData, name: string) {
  const v = fd.get(name);
  return v instanceof File ? v : null;
}

/** "YYYY-MM-DD" → shu kunning oxiri (Toshkent vaqti, UTC+5) */
export function endOfDayTashkent(dateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T23:59:59+05:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function endOfDayInDays(days: number) {
  const now = new Date(Date.now() + 5 * 3_600_000); // Toshkent
  now.setUTCDate(now.getUTCDate() + days);
  return endOfDayTashkent(now.toISOString().slice(0, 10))!;
}

export function isHttpsUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && v.length <= 500;
  } catch {
    return false;
  }
}
