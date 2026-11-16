import "server-only";
import { headers } from "next/headers";

/** Traefik/Dokploy proksi orqasida mijozning haqiqiy IP manzili. */
export async function getClientIp() {
  const h = await headers();
  const real = h.get("x-real-ip");
  if (real) return real.trim().slice(0, 64);
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return "unknown";
}

export async function getUserAgent() {
  const h = await headers();
  return (h.get("user-agent") ?? "").slice(0, 300);
}
