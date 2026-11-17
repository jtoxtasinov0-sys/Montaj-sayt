import { ArrowRight, ArrowUpRight, Check, Clock, Flame, Plus, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/client-effects";
import { EditorCard } from "@/components/editor-card";
import { Sparkle } from "@/components/icons";
import { Stars } from "@/components/stars";
import type { PriceTier, PromotionPlan } from "@/db/schema";
import { CATEGORIES, SOFTWARE } from "@/lib/constants";
import type { EditorCardData } from "@/lib/data";
import { fmt, type Dict } from "@/lib/i18n";
import { cn, formatUzs } from "@/lib/utils";

export function SectionHead({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-reveal className={cn("mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        <h2 className="h-section text-[clamp(2.2rem,5vw,4.2rem)] text-balance">{title}</h2>
        {subtitle && <p className="mt-4 max-w-xl text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------- Marquee ----------
export function SoftwareMarquee() {
  const items = [...SOFTWARE, ...SOFTWARE];
  return (
    <div id="marquee" className="marquee py-10" style={{ "--speed": "50s" } as React.CSSProperties}>
      {[0, 1].map((k) => (
        <div key={k} className="marquee-track" aria-hidden={k === 1}>
          {items.map((s, i) => (
            <span key={i} className="flex items-center gap-3 text-2xl font-extralight tracking-tight text-muted">
              <Sparkle className="h-3.5 w-3.5 text-primary-2" />
              {s}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- Statistika ----------
export function StatsStrip({ d, s }: { d: Dict; s: { editors: number; completed: number; avgRating: number; onTimePct: number } }) {
  const items = [
    { v: s.editors, suffix: "+", label: d.stats.editors },
    { v: s.completed, suffix: "+", label: d.stats.completed },
    { v: s.avgRating || 5, decimals: 1, suffix: "★", label: d.stats.rating },
    { v: s.onTimePct || 100, suffix: "%", label: d.stats.onTime },
  ];
  return (
    <section className="container-x">
      <div data-reveal className="grid grid-cols-2 divide-line border-y border-line md:grid-cols-4 md:divide-x">
        {items.map((it) => (
          <div key={it.label} className="px-2 py-8 text-center md:py-10">
            <div className="text-5xl font-extralight tracking-tighter sm:text-6xl">
              <CountUp to={it.v} decimals={it.decimals ?? 0} suffix={it.suffix} />
            </div>
            <div className="mt-2 text-sm text-muted">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Qanday ishlaydi (Nymera: yorug' panel + katta raqamlar) ----------
export function HowItWorks({ d }: { d: Dict }) {
  const Col = ({ title, steps }: { title: string; steps: { t: string; d: string }[] }) => (
    <div>
      <h3 className="mb-6 flex items-center gap-2 text-sm tracking-wide text-muted">
        <Sparkle className="h-3 w-3 text-accent" />
        {title}
      </h3>
      <ol className="space-y-8">
        {steps.map((s, i) => (
          <li key={s.t} data-reveal className="grid grid-cols-[auto_1fr] items-start gap-5">
            <span className="h-display w-[1.3em] text-[clamp(3.5rem,7vw,5.5rem)] text-[color-mix(in_oklab,currentColor_35%,transparent)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="pt-2">
              <p className="text-2xl font-light tracking-tight">{s.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
  return (
    <section id="how" className="mx-2 scroll-mt-20 sm:mx-3">
      <div className="panel-invert relative overflow-hidden rounded-[2rem] px-5 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="container-x !px-0">
          <h2 data-reveal className="h-section mb-14 max-w-3xl text-[clamp(2.4rem,6vw,5rem)] text-balance">
            {d.how.title.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-primary">{d.how.title.split(" ").slice(-1)}</span>
          </h2>
          <div className="grid gap-14 md:grid-cols-2 md:gap-20">
            <Col title={d.how.forClients} steps={d.how.client} />
            <Col title={d.how.forEditors} steps={d.how.editor} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Narx bo'limlari ----------
export function TiersSection({
  d,
  tiers,
  counts,
}: {
  d: Dict;
  tiers: PriceTier[];
  counts: Record<number, { editors: number; jobs: number }>;
}) {
  return (
    <section className="relative container-x py-24">
      <div className="grid-floor absolute inset-0 -z-10" aria-hidden />
      <SectionHead title={d.tiers.title} subtitle={d.tiers.subtitle} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiers.map((t, i) => (
          <div
            key={t.id}
            data-reveal
            data-spotlight
            className={cn("card flex flex-col p-6", i === 2 && "ring-glow")}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="text-[2.6rem] leading-none font-extralight tracking-tighter">
              ${t.minUsd}
              <span className="text-muted">{t.maxUsd ? `–${t.maxUsd}` : "+"}</span>
            </div>
            {/* Barcha kartalarda bir xil balandlik — qatorlar bir chiziqda turadi */}
            <div className="mt-1.5 h-4 text-xs text-muted">{!t.maxUsd && d.tiers.plus}</div>
            <div className="mt-6 mb-6 space-y-1.5 text-sm text-muted">
              <div className="flex justify-between">
                <span>{d.tiers.editorsLink}</span>
                <span className="text-fg">{counts[t.id]?.editors ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{d.tiers.jobsLink}</span>
                <span className="text-fg">{counts[t.id]?.jobs ?? 0}</span>
              </div>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <Link href={`/editors?tier=${t.id}`} className="btn btn-ghost btn-sm px-2 text-xs">
                {d.tiers.editorsLink}
              </Link>
              <Link href={`/jobs?tier=${t.id}`} className="btn btn-primary btn-sm px-2 text-xs">
                {d.tiers.jobsLink}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Yo'nalishlar (3D ikonkalar) ----------
// 5 ustunli bento: 1-qator Reels(2)+3 ta, 2-qator Motion(2)+Podkast+Rang(2)
const WIDE = new Set([0, 4, 6]);

export function CategoriesSection({ d }: { d: Dict }) {
  const cats = CATEGORIES.filter((c) => c.key !== "other");
  return (
    <section className="container-x py-12">
      <SectionHead
        title={d.categoriesSection.title}
        action={
          <Link href="/editors" className="btn btn-ghost">
            {d.common.viewAll} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cats.map((c, i) => (
          <Link
            key={c.key}
            href={`/editors?category=${c.key}`}
            data-reveal
            className={cn(
              "dark group relative isolate flex flex-col justify-end overflow-hidden rounded-[1.75rem] border border-line bg-[#06061a] p-5 text-fg",
              // toq sonli oxirgi karta mobil 2 ustunda yolg'iz qolmasin — keng karta bo'ladi
              i === cats.length - 1 && cats.length % 2 === 1 ? "col-span-2 aspect-[2/1]" : "aspect-square",
              WIDE.has(i) && "md:col-span-2 md:aspect-auto",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.image}
              alt=""
              loading="lazy"
              decoding="async"
              width={512}
              height={512}
              className={cn(
                "absolute -z-10 object-contain mix-blend-screen transition duration-700 [mask-image:radial-gradient(circle,#000_48%,transparent_70%)] group-hover:scale-110 group-hover:-rotate-3",
                WIDE.has(i) ? "top-1/2 right-0 h-[120%] -translate-y-1/2" : "inset-0 m-auto h-[85%] -translate-y-5",
              )}
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#06061a] via-transparent to-transparent" />
            <div className="flex items-end justify-between gap-2">
              <span className="text-lg leading-tight font-light tracking-tight text-balance sm:text-xl">{d.categories[c.key]}</span>
              <span className="absolute top-4 right-4 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-[#06061a]/60 backdrop-blur transition group-hover:border-primary-2 group-hover:bg-primary sm:static sm:bg-transparent sm:backdrop-blur-none">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------- TOP montajorlar ----------
export function TopEditorsSection({ d, editors }: { d: Dict; editors: EditorCardData[] }) {
  return (
    <section className="container-x py-24">
      <SectionHead
        title={d.topEditors.title}
        action={
          <Link href="/editors" className="btn btn-ghost">
            {d.common.viewAll} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {editors.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          {d.topEditors.empty}{" "}
          <Link href="/dashboard/profile" className="text-primary-2 underline">
            {d.nav.becomeEditor}
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {editors.map((e) => (
            <div key={e.id} data-reveal>
              <EditorCard e={e} d={d} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Kadrlar (kino lentasi) ----------
const STILLS = [
  { src: "/images/stills/wedding-hijab.webp", cat: "wedding" },
  { src: "/images/stills/car.webp", cat: "ads" },
  { src: "/images/stills/reels.webp", cat: "reels" },
  { src: "/images/stills/podcast-hosts.webp", cat: "podcast" },
  { src: "/images/stills/travel.webp", cat: "youtube" },
  { src: "/images/stills/food.webp", cat: "ads" },
];

export function ShowcaseStrip({ d }: { d: Dict }) {
  return (
    // overflow-x-clip: qiya (-1°) lenta burchaklari sahifani yonga surmasin
    <section className="overflow-x-clip py-12">
      <div className="container-x">
        <SectionHead title={d.showcase.title} />
      </div>
      <div className="marquee -rotate-1" style={{ "--speed": "60s" } as React.CSSProperties}>
        {[0, 1].map((k) => (
          <div key={k} className="marquee-track !gap-3 !pr-3" aria-hidden={k === 1}>
            {STILLS.map((s, i) => (
              <figure key={i} className="w-[min(78vw,420px)] shrink-0 overflow-hidden rounded-2xl bg-[#0b0b16] p-0">
                <div className="film-edge mx-2 my-1.5 opacity-60" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt="" loading="lazy" decoding="async" width={1280} height={714} className="aspect-video w-full object-cover" />
                <div className="film-edge mx-2 my-1.5 opacity-60" />
                <figcaption className="sr-only">{d.categories[s.cat]}</figcaption>
              </figure>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Reyting tizimi ----------
export function RatingSection({ d }: { d: Dict }) {
  return (
    <section className="container-x py-24">
      <SectionHead title={d.rating.title} subtitle={d.rating.subtitle} />
      <div className="grid gap-3 md:grid-cols-3">
        <div data-reveal data-spotlight className="card p-7">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Star className="h-5 w-5 fill-current" />
            </span>
            <span className="text-5xl font-extralight tracking-tighter">60%</span>
          </div>
          <p className="mt-8 text-2xl font-light tracking-tight">{d.rating.quality}</p>
          <p className="mt-2 text-sm text-muted">{d.rating.qualityText}</p>
          <div className="mt-6 flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-6 w-6 fill-accent text-accent" style={{ opacity: 0.4 + i * 0.12 }} />
            ))}
          </div>
        </div>
        <div data-reveal data-spotlight className="card p-7">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary-2">
              <Clock className="h-5 w-5" />
            </span>
            <span className="text-5xl font-extralight tracking-tighter">25%</span>
          </div>
          <p className="mt-8 text-2xl font-light tracking-tight">{d.rating.onTime}</p>
          <p className="mt-2 text-sm text-muted">{d.rating.onTimeText}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-primary to-primary-2" />
          </div>
        </div>
        <div data-reveal data-spotlight className="card p-7">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-success/15 text-success">
              <TrendingUp className="h-5 w-5" />
            </span>
            <span className="text-5xl font-extralight tracking-tighter">15%</span>
          </div>
          <p className="mt-8 text-2xl font-light tracking-tight">{d.rating.count}</p>
          <p className="mt-2 text-sm text-muted">{d.rating.countText}</p>
          <div className="mt-6 flex h-8 items-end gap-1">
            {[30, 45, 38, 60, 52, 75, 68, 90, 82, 100].map((h, i) => (
              <span key={i} className="flex-1 rounded-sm bg-gradient-to-t from-success/30 to-success" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- TOP rejalar ----------
export function PromoSection({ d, plans }: { d: Dict; plans: PromotionPlan[] }) {
  return (
    <section id="top" className="mx-2 scroll-mt-20 sm:mx-3">
      <div className="dark relative isolate overflow-hidden rounded-[2rem] border border-line bg-[#05050f] px-4 py-20 text-fg sm:px-8 lg:py-28">
        <Stars className="absolute inset-0 -z-10 opacity-60" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-[radial-gradient(ellipse_50%_70%_at_50%_100%,rgba(61,76,228,0.45),transparent_70%)]" />
        <div className="grid-floor absolute inset-x-0 bottom-0 -z-10 h-1/2 [transform:perspective(600px)_rotateX(55deg)] opacity-60" />
        <div className="container-x !px-0 grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div data-reveal>
            <h2 className="h-section text-[clamp(2.4rem,5vw,4.4rem)] text-balance">{d.promo.title}</h2>
            <p className="mt-5 max-w-md text-muted">{d.promo.subtitle}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/rocket.webp"
              alt=""
              loading="lazy"
              width={768}
              height={768}
              className="animate-float mx-auto mt-6 w-64 mix-blend-screen [mask-image:radial-gradient(circle,#000_50%,transparent_70%)] lg:mx-0 lg:w-80"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((p, i) => (
              <div
                key={p.id}
                data-reveal
                data-spotlight
                className={cn(
                  "card flex flex-col p-6",
                  p.isPopular && "ring-glow bg-gradient-to-b from-primary/25 to-transparent sm:-translate-y-4",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">{p.name}</span>
                  {p.isPopular && (
                    <span className="chip chip-accent">
                      <Flame className="h-3 w-3" /> {d.promo.popular}
                    </span>
                  )}
                </div>
                <div className="mt-6 text-4xl font-extralight tracking-tighter">{formatUzs(p.priceUzs)}</div>
                <div className="text-sm text-muted">
                  {d.common.uzs} / {fmt(d.promo.perDays, { days: p.days })}
                </div>
                <ul className="my-6 space-y-2.5 text-sm">
                  {d.promo.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary-2" /> {f}
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-muted">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    {fmt(d.promo.weight, { w: i + 1 })}
                  </li>
                </ul>
                <Link
                  href={`/dashboard/promote?plan=${p.id}`}
                  className={cn("btn mt-auto w-full", p.isPopular ? "btn-primary" : "btn-ghost")}
                >
                  {d.promo.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- FAQ ----------
export function FaqSection({ d }: { d: Dict }) {
  return (
    <section className="container-x grid gap-10 py-24 lg:grid-cols-[0.8fr_1.2fr]">
      <div data-reveal>
        <h2 className="h-section text-[clamp(2.2rem,4.5vw,3.8rem)] text-balance">{d.faq.title}</h2>
      </div>
      <div className="divide-y divide-line border-y border-line">
        {d.faq.items.map((f) => (
          <details key={f.q} className="faq group" data-reveal>
            <summary className="flex items-center justify-between gap-6 py-6 text-lg font-light tracking-tight sm:text-xl">
              {f.q}
              <span className="faq-icon grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line group-open:bg-primary group-open:text-white">
                <Plus className="h-4 w-4" />
              </span>
            </summary>
            <p className="max-w-2xl pb-6 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ---------- Yakuniy CTA ----------
export function FinalCta({ d }: { d: Dict }) {
  return (
    <section className="container-x">
      <div className="dark relative isolate overflow-hidden rounded-[2rem] border border-line bg-[#05050f] text-fg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/workspace.webp"
          alt=""
          loading="lazy"
          width={1376}
          height={768}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#05050f] via-[#05050f]/80 to-transparent" />
        <div className="horizon bottom-0 -z-10" aria-hidden />
        <div data-reveal className="max-w-2xl px-6 py-20 sm:px-12 lg:py-28">
          <Sparkle className="h-6 w-6 text-accent" />
          <h2 className="h-section mt-5 text-[clamp(2.4rem,5vw,4.4rem)]">{d.cta.title}</h2>
          <p className="mt-5 text-muted">{d.cta.subtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/orders/new" className="btn btn-primary btn-lg pr-2.5">
              {d.cta.client}
              <span className="btn-arrow !mr-0">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link href="/dashboard/profile" className="btn btn-ghost btn-lg">
              {d.cta.editor}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
