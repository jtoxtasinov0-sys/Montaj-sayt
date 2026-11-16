import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { exchangeCodeForProfile } from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";
import { upsertGoogleUser } from "@/lib/auth/users";
import { env } from "@/lib/env";
import { getClientIp, getUserAgent } from "@/lib/ip";
import { safeNext } from "@/lib/utils";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const savedState = jar.get("g_state")?.value;
  const verifier = jar.get("g_verifier")?.value;
  const next = safeNext(jar.get("g_next")?.value);
  jar.delete("g_state");
  jar.delete("g_verifier");
  jar.delete("g_next");

  const fail = (reason: string) => NextResponse.redirect(`${env.appUrl}/login?error=${reason}`);

  if (!code || !state || !savedState || !verifier || !safeEqual(state, savedState)) return fail("state");

  try {
    const profile = await exchangeCodeForProfile(code, verifier);
    if (!profile.email_verified) return fail("email");
    const user = await upsertGoogleUser(profile);
    if (user.status === "BANNED") return fail("banned");
    const ip = await getClientIp();
    await createSession(user.id, { ip, userAgent: await getUserAgent() });
    await audit({ actorId: user.id, actorLabel: user.email, action: "auth.login", ip });
    return NextResponse.redirect(`${env.appUrl}${next}`);
  } catch (e) {
    console.error("[auth] google callback failed", e);
    return fail("failed");
  }
}
