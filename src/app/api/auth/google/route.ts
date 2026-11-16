import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createPkce, googleAuthUrl } from "@/lib/auth/google";
import { env } from "@/lib/env";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/utils";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ip = await getClientIp();
  if (!rateLimit(`auth:${ip}`, 20, 60_000).ok) {
    return NextResponse.redirect(`${env.appUrl}/login?error=rate`);
  }
  if (!env.googleClientId || !env.googleClientSecret) {
    return NextResponse.redirect(`${env.appUrl}/login?error=config`);
  }
  const { verifier, challenge, state } = createPkce();
  const jar = await cookies();
  const opts = { httpOnly: true, secure: env.secureCookies, sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set("g_state", state, opts);
  jar.set("g_verifier", verifier, opts);
  jar.set("g_next", safeNext(url.searchParams.get("next")), opts);
  return NextResponse.redirect(googleAuthUrl(state, challenge));
}
