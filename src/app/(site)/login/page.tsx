import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleIcon } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { Stars } from "@/components/stars";
import { getCurrentUser } from "@/lib/auth/current";
import { env } from "@/lib/env";
import { getDict } from "@/lib/i18n";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Login", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const [user, d] = await Promise.all([getCurrentUser(), getDict()]);
  if (user) redirect(next);
  const error = sp.error ? (d.auth.errors[sp.error] ?? d.auth.errors.failed) : null;

  return (
    <section className="dark relative isolate mx-2 mt-2 grid min-h-[92svh] place-items-center overflow-hidden rounded-[2rem] border border-line bg-[#05050f] px-4 pt-24 pb-12 text-fg sm:mx-3">
      <Stars className="absolute inset-0 -z-10 opacity-70" />
      <div className="planet -z-10" aria-hidden />
      <div className="horizon bottom-[18%] -z-10" aria-hidden />
      <div className="card fade-up w-full max-w-md p-8 text-center sm:p-10">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="h-hero mt-6 text-4xl">{d.auth.title}</h1>
        <p className="mt-3 text-sm text-muted">{d.auth.subtitle}</p>
        {error && <p className="mt-5 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className="btn btn-light btn-lg mt-8 w-full">
          <GoogleIcon className="h-5 w-5" />
          {d.auth.google}
        </a>
        {env.devLoginEnabled && (
          <form action="/api/auth/dev" method="get" className="mt-6 space-y-2 border-t border-line pt-6 text-left">
            <input type="hidden" name="next" value={next} />
            <label className="label">{d.auth.devLogin}</label>
            <div className="flex gap-2">
              <input name="email" type="email" required defaultValue="admin@example.com" className="input" />
              <button className="btn btn-ghost">→</button>
            </div>
          </form>
        )}
        <p className="mt-6 text-xs text-muted">{d.auth.agree}</p>
      </div>
    </section>
  );
}
