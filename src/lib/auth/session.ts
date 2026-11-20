import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { env } from "@/lib/env";

const DAY = 86_400_000;
const SESSION_TTL = 30 * DAY;
const REFRESH_WHEN_LEFT = 15 * DAY;

/** `__Host-` prefiksi: faqat HTTPS, faqat shu domen, Path=/ — cookie o'g'irlash/qalbakilashtirishdan himoya */
export function sessionCookieName() {
  return env.secureCookies ? "__Host-mh_session" : "mh_session";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, meta: { ip?: string; userAgent?: string } = {}) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL);
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  // vaqti-vaqti bilan eskirgan sessiyalarni tozalash
  if (Math.random() < 0.05) {
    db.delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .catch(() => {});
  }
  const jar = await cookies();
  jar.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return token;
}

const sessionUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  image: users.image,
  role: users.role,
  status: users.status,
  telegram: users.telegram,
  phone: users.phone,
  locale: users.locale,
  createdAt: users.createdAt,
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "BANNED";
  telegram: string | null;
  phone: string | null;
  locale: string;
  createdAt: Date;
};

export const getCurrentSession = cache(async (): Promise<{ sessionId: string; user: SessionUser } | null> => {
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token || token.length > 100) return null;
  const id = hashToken(token);
  const rows = await db
    .select({ expiresAt: sessions.expiresAt, lastSeenAt: users.lastSeenAt, user: sessionUserColumns })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.user.status === "BANNED") {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  // "Onlayn" belgisi uchun oxirgi faollik — 45 soniyada ko'pi bilan bir marta yoziladi, javobni kutmaydi
  if (!row.lastSeenAt || Date.now() - row.lastSeenAt.getTime() > 45_000) {
    db.update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, row.user.id))
      .catch(() => {});
  }
  // sliding expiration
  if (row.expiresAt.getTime() - Date.now() < REFRESH_WHEN_LEFT) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_TTL) })
      .where(eq(sessions.id, id));
  }
  return { sessionId: id, user: row.user as SessionUser };
});

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(sessionCookieName());
}

export async function destroyAllUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
