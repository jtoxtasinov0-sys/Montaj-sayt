import { getCurrentSession } from "@/lib/auth/session";

/** Ochiq tabdan keladigan "shu yerdaman" signali: sessiyani o'qish oxirgi faollik vaqtini yangilaydi (onlayn belgisi) */
export async function POST() {
  await getCurrentSession();
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
