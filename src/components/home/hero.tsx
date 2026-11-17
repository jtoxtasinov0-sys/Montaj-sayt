import { ArrowRight, ArrowUpRight, MousePointer2 } from "lucide-react";
import Link from "next/link";
import { Sparkle } from "@/components/icons";
import { Stars } from "@/components/stars";
import { HeroVisual } from "./hero-visual";
import type { Dict } from "@/lib/i18n";

type Props = { d: Dict; stats: { editors: number; avgRating: number; onTimePct: number } };

export function Hero({ d, stats }: Props) {
  return (
    <section className="dark relative isolate mx-2 mt-2 overflow-hidden rounded-[2rem] border border-line bg-[#05050f] text-fg sm:mx-3">
      {/* fon: yulduzlar, planeta yoyi, ufq chizig'i */}
      <Stars className="absolute inset-0 -z-10 opacity-70" />
      <div className="planet -z-10" aria-hidden />
      <div className="horizon -z-10 bottom-0" aria-hidden />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(61,76,228,0.35),transparent_70%)]"
      />

      {/* Mobil tartib: matn → vizual → kartalar. Desktop: chapda matn+kartalar, o'ngda vizual */}
      <div className="container-x relative grid min-h-[100svh] content-center gap-10 pt-28 pb-24 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-12 lg:pt-32">
        <div className="relative z-10 lg:col-span-7 lg:row-start-1">
          <span className="fade-up inline-flex items-center gap-2 rounded-full border border-line bg-white/5 py-1 pr-3 pl-1 text-xs text-muted backdrop-blur">
            <span className="chip-primary chip h-6">
              <Sparkle className="h-2.5 w-2.5" /> 2026
            </span>
            {d.hero.badge}
          </span>

          <h1 className="h-hero mt-7 text-[clamp(2.7rem,7.4vw,6.1rem)]">
            <span className="rise block overflow-hidden pb-[0.08em]">
              <span>{d.hero.titleA}</span>
            </span>
            <span className="rise flex items-start gap-4 overflow-hidden pb-[0.08em]">
              <span style={{ animationDelay: "0.12s" }}>
                <span className="text-gradient">{d.hero.titleB}</span>
              </span>
              <span
                className="fade-up mt-[0.6em] hidden max-w-[9rem] text-[0.8rem] leading-snug font-normal tracking-normal text-muted xl:block"
                style={{ animationDelay: "0.8s" }}
              >
                {d.hero.note}
              </span>
            </span>
            <span className="rise flex items-center gap-4 overflow-hidden pb-[0.08em]">
              <span style={{ animationDelay: "0.24s" }}>{d.hero.titleC}</span>
              <Sparkle className="fade-up h-[0.35em] w-[0.35em] text-accent [animation-delay:1s]" />
            </span>
          </h1>

          <p className="fade-up mt-7 max-w-xl text-base leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "0.4s" }}>
            {d.hero.subtitle}
          </p>

          <div className="fade-up mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.55s" }}>
            <Link href="/editors" className="btn btn-primary btn-lg pr-2.5">
              {d.hero.ctaFind}
              <span className="btn-arrow !mr-0">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link href="/dashboard/profile" className="btn btn-ghost btn-lg">
              {d.hero.ctaJoin}
            </Link>
          </div>
        </div>

        <div className="relative lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:self-center">
          <HeroVisual />
        </div>

        {/* Nymera uslubidagi oq kartalar + FXIFY "Get started today" kartasi */}
        <div className="relative z-10 lg:col-span-7 lg:row-start-2">
          <div className="fade-up flex flex-wrap gap-3" style={{ animationDelay: "0.75s" }}>
            <div className="w-40 rounded-3xl bg-[#f1f1f4] p-4 text-[#0b0b1a] shadow-xl shadow-black/30">
              {stats.editors >= 10 ? (
                <>
                  <div className="text-right text-4xl font-extralight tracking-tight text-primary">{stats.editors}+</div>
                  <div className="text-right text-sm">{d.stats.editors}</div>
                </>
              ) : (
                <>
                  <div className="text-right text-4xl font-extralight tracking-tight text-primary">$10</div>
                  <div className="text-right text-sm">{d.hero.fromPrice}</div>
                </>
              )}
              <p className="mt-5 text-[0.7rem] leading-snug text-[#5d5f7a]">{d.categoriesSection.title}</p>
            </div>
            <div className="w-40 rounded-3xl bg-[#f1f1f4] p-4 text-[#0b0b1a] shadow-xl shadow-black/30">
              <div className="text-right text-4xl font-extralight tracking-tight text-primary">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "5.0"}★
              </div>
              <div className="text-right text-sm">{d.stats.rating}</div>
              <p className="mt-5 text-[0.7rem] leading-snug text-[#5d5f7a]">{d.rating.title}</p>
            </div>
            <Link
              href="/login"
              className="group relative hidden w-56 flex-col justify-between overflow-hidden rounded-3xl border border-line bg-white/[0.04] p-4 backdrop-blur-md transition hover:border-primary-2 sm:flex"
            >
              <span className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-primary/40 blur-2xl" aria-hidden />
              <div>
                <p className="text-sm font-medium">{d.hero.sideTitle}</p>
                <p className="mt-1.5 text-[0.72rem] leading-snug text-muted">{d.hero.sideText}</p>
              </div>
              <span className="btn btn-primary btn-sm mt-4 self-start">
                {d.hero.sideCta} <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </div>

      <a
        href="#marquee"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs text-muted transition hover:text-fg sm:flex"
      >
        <span className="relative grid h-8 w-5 place-items-start justify-center rounded-full border border-line-strong pt-1.5">
          <span className="h-1.5 w-1 rounded-full bg-fg [animation:scroll-dot_1.8s_ease-in-out_infinite]" />
        </span>
        {d.hero.scroll}
        <MousePointer2 className="h-3 w-3 rotate-[200deg]" />
      </a>
    </section>
  );
}
