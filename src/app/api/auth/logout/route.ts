import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/auth/session";
import { env } from "@/lib/env";

export async function POST() {
  await destroyCurrentSession();
  return NextResponse.redirect(`${env.appUrl}/`, { status: 303 });
}
