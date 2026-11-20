import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SplitText } from "@/components/motion";
import type { Dict } from "@/lib/i18n";
import { HeroArt } from "./hero-art";

type Css = React.CSSProperties & Record<`--${string}`, string | number>;

/** Montaj taymlayni: kliplar chapdan o'ngga chiziladi, pleyhed sekin yuradi (vaqt yozuvlari va o'lchov chizig'i yo'q) */
const CLIPS = [
  { row: 0, l: 0, w: 21, fill: true, d: 550 },
  { row: 0, l: 22, w: 30, d: 700 },
  { row: 0, l: 53, w: 15, fill: true, d: 850 },
  { row: 0, l: 69, w: 31, d: 1000 },
  { row: 1, l: 6, w: 38, d: 800 },
  { row: 1, l: 46, w: 26, fill: true, d: 950 },
  { row: 1, l: 74, w: 18, d: 1100 },
];

function HeroTimeline() {
  return (
    <div data-anim aria-hidden className="mt-10 sm:mt-12">
      <div className="tl">
        {[0, 1].map((row) => (
          <div key={row} className="tl-track" style={{ top: row === 0 ? "0.7rem" : "2.3rem" }}>
            {CLIPS.filter((c) => c.row === row).map((c) => (
              <span
                key={c.l}
                className={c.fill ? "tl-clip is-fill" : "tl-clip"}
                style={{ left: `${c.l}%`, width: `${c.w}%`, animationDelay: `${c.d}ms` } as Css}
              />
            ))}
          </div>
        ))}
        <div className="tl-head" />
      </div>
    </div>
  );
}

/**
 * Minimal hero (minimal.gallery uslubi): asosan matn, ortiqcha bezaksiz.
 * E'tibor tortuvchi detallar: o'ngda o'zini chizadigan ingichka illyustratsiya va pastda montaj taymlayni.
 */
export function Hero({ d }: { d: Dict }) {
  return (
    <section className="container-x pt-32 pb-10 sm:pt-36">
      <div className="relative">
        {/* O'ng tomonda almashib turuvchi illyustratsiya (Gemini'da chizilgan). Telefonda joy tor — u yerda yashirin. */}
        <HeroArt className="absolute top-0 right-0 hidden lg:block" />

        <p className="eyebrow fade-up">{d.hero.badge}</p>

        <h1 className="h-hero mt-7 text-[clamp(3rem,9.5vw,8rem)]">
          <span className="block pb-[0.06em]">
            <SplitText text={d.hero.titleA} load delay={80} stagger={70} />
          </span>
          <span className="block pb-[0.06em]">
            <SplitText text={d.hero.titleB} load delay={200} stagger={70} />
          </span>
          <span className="block pb-[0.06em] text-muted">
            <SplitText text={d.hero.titleC} load delay={320} stagger={70} />
          </span>
        </h1>
      </div>

      <HeroTimeline />

      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-end">
        <p className="fade-up max-w-md text-base leading-relaxed text-muted sm:text-lg lg:col-span-6" style={{ animationDelay: "0.45s" }}>
          {d.hero.subtitle}
        </p>
        <div className="fade-up flex flex-wrap gap-3 lg:col-span-6 lg:justify-end" style={{ animationDelay: "0.55s" }}>
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
    </section>
  );
}
