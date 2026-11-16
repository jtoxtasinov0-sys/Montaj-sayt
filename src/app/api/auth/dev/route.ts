import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { upsertGoogleUser } from "@/lib/auth/users";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/utils";

/**
 * FAQAT lokal ishlab chiqish uchun: Google kalitlarisiz test kirish.
 * ALLOW_DEV_LOGIN=true va APP_URL=http://localhost bo'lgandagina ishlaydi.
 */
export async function GET(req: Request) {
  if (!env.devLoginEnabled) return new NextResponse("Not found", { status: 404 });
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "dev@example.com").toLowerCase().slice(0, 100);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return new NextResponse("bad email", { status: 400 });
  const user = await upsertGoogleUser({ sub: `dev:${email}`, email, name: url.searchParams.get("name") ?? undefined });
  if (user.status === "BANNED") return NextResponse.redirect(`${env.appUrl}/login?error=banned`);
  await createSession(user.id, { ip: "dev" });
  return NextResponse.redirect(`${env.appUrl}${safeNext(url.searchParams.get("next"))}`);
}
