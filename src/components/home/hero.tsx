import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Sparkle } from "@/components/icons";
import { SplitText } from "@/components/motion";
import { Stars } from "@/components/stars";
import type { Dict } from "@/lib/i18n";
import { HeroStudio } from "./hero-studio";

/**
 * Minimal hero: sarlavha, bitta jumla, ikki tugma va bitta "wow" belgi — kodda chizilgan
 * montaj studiyasi (montaj, harakat, rang va 3D bitta oynada; rasm yo'q). Fon ataylab sokin.
 */
export function Hero({ d }: { d: Dict }) {
  return (
    <section
      data-anim
      className="relative isolate mx-2 mt-2 overflow-hidden rounded-[2rem] border border-line bg-[#efeef4] text-fg sm:mx-3 dark:bg-[#05050f]"
    >
      <Stars className="absolute inset-0 -z-10 hidden opacity-40 dark:block" />
      <div
        aria-hidden
        className="absolute -top-48 left-1/2 -z-10 h-96 w-[min(64rem,160%)] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
      />

      {/* Telefon: sarlavha → belgi → matn va tugmalar (belgi birinchi ekranda ko'rinsin).
          Kompyuter: chapda matn, o'ngda belgi. */}
      <div className="container-x grid content-center items-center gap-x-10 gap-y-9 pt-24 pb-14 sm:pt-28 lg:min-h-[100svh] lg:grid-cols-12 lg:gap-y-0 lg:pt-32 lg:pb-24">
        <div className="relative z-10 lg:col-span-6 lg:row-start-1 lg:self-end">
          <span className="fade-up inline-flex items-center gap-2 rounded-full border border-line bg-card py-1 pr-3 pl-1 text-xs text-muted backdrop-blur">
            <span className="chip-primary chip h-6">
              <Sparkle className="h-2.5 w-2.5" /> 2026
            </span>
            {d.hero.badge}
          </span>

          <h1 className="h-hero mt-6 text-[clamp(2.5rem,6.4vw,5.3rem)] sm:mt-7">
            <span className="block pb-[0.08em]">
              <SplitText text={d.hero.titleA} load delay={120} stagger={90} wordClassName="text-silver" />
            </span>
            <span className="block pb-[0.08em]">
              <SplitText text={d.hero.titleB} load delay={300} stagger={90} wordClassName="text-gradient" />
            </span>
            <span className="block pb-[0.08em]">
              <SplitText text={d.hero.titleC} load delay={460} stagger={90} wordClassName="text-silver" />
            </span>
          </h1>
        </div>

        <div className="lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1">
          <HeroStudio />
        </div>

        <div className="relative z-10 lg:col-span-6 lg:row-start-2 lg:self-start">
          <p className="max-w-lg text-base leading-relaxed text-muted sm:text-lg lg:mt-6">
            <SplitText text={d.hero.subtitle} load delay={620} stagger={22} />
          </p>

          <div className="fade-up mt-8 flex flex-wrap items-center gap-3 sm:mt-9" style={{ animationDelay: "0.55s" }}>
            <Link href="/editors" className="btn btn-primary btn-glow btn-lg pr-2.5">
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
      </div>
    </section>
  );
}
