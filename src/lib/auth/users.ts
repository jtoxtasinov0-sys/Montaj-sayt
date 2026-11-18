import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { keyFromUploadUrl } from "@/lib/uploads-url";

/** Google profili bo'yicha foydalanuvchini topish yoki yaratish */
export async function upsertGoogleUser(p: { sub: string; email: string; name?: string; picture?: string }) {
  const email = p.email.toLowerCase();
  const isAdminEmail = env.adminEmails.includes(email);

  const byGoogle = await db.select().from(users).where(eq(users.googleId, p.sub)).limit(1);
  let user = byGoogle[0];
  if (!user) {
    const byEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    user = byEmail[0];
  }

  if (user) {
    const [updated] = await db
      .update(users)
      .set({
        googleId: p.sub,
        email,
        name: user.name || p.name || email.split("@")[0],
        // O'zi yuklagan rasmni har kirishda Google rasmi bilan almashtirmaymiz
        image: keyFromUploadUrl(user.image) ? user.image : (p.picture ?? user.image),
        lastLoginAt: new Date(),
        ...(isAdminEmail ? { role: "ADMIN" as const } : {}),
      })
      .where(eq(users.id, user.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      googleId: p.sub,
      email,
      name: (p.name ?? email.split("@")[0]).slice(0, 80),
      image: p.picture,
      role: isAdminEmail ? "ADMIN" : "USER",
      lastLoginAt: new Date(),
    })
    .returning();
  return created;
}
