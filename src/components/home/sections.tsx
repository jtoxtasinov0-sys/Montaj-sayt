import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  Clapperboard,
  ClipboardList,
  Clock,
  Film,
  Flame,
  LayoutDashboard,
  Plus,
  Rocket,
  Search,
  Send,
  Settings,
  Star,
  TrendingUp,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/client-effects";
import { EditorCard } from "@/components/editor-card";
import { Sparkle } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { Floor, Neon, Particles, PixelGrid, SplitText } from "@/components/motion";
import { Stars } from "@/components/stars";
import type { PriceTier, PromotionPlan } from "@/db/schema";
import { CATEGORIES, SOFTWARE } from "@/lib/constants";
import type { EditorCardData } from "@/lib/data";
import { fmt, type Dict } from "@/lib/i18n";
import { cn, formatUzs } from "@/lib/utils";

type Css = React.CSSProperties & Record<`--${string}`, string | number>;
/** Ketma-ket paydo bo'lish kechikishi */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as Css;

export function SectionHead({
  title,
  subtitle,
  action,
  eyebrow,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <span data-reveal className="eyebrow mb-5">
            {eyebrow}
          </span>
        )}
        <h2 className="h-section text-[clamp(2.2rem,5vw,4.2rem)] text-balance">
          <SplitText text={title} wordClassName="text-silver" />
        </h2>
        {subtitle && (
          <p data-reveal className="mt-4 max-w-xl text-muted" style={delay(220)}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div data-reveal style={delay(320)}>
          {action}
        </div>
      )}
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
    <section data-anim className="container-x overflow-x-clip">
      <div className="relative grid grid-cols-2 divide-line border-y border-line md:grid-cols-4 md:divide-x">
        <span className="beam-line" aria-hidden />
        {items.map((it, i) => (
          <div key={it.label} data-reveal className="px-2 py-8 text-center md:py-10" style={delay(i * 110)}>
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
          <li key={s.t} data-reveal className="grid grid-cols-[auto_1fr] items-start gap-5" style={delay(i * 110)}>
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
          <h2 className="h-section mb-14 max-w-3xl text-[clamp(2.4rem,6vw,5rem)] text-balance">
            <SplitText text={d.how.title.split(" ").slice(0, -1).join(" ")} wordClassName="text-silver" />{" "}
            <SplitText text={d.how.title.split(" ").slice(-1)[0]} start={d.how.title.split(" ").length - 1} wordClassName="text-primary" />
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

// ---------- Narx bo'limlari (FXIFY: "Choose what's best for you" — 3D kartalar, nurli pol) ----------
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
    <section data-anim className="relative isolate overflow-x-clip">
      <Floor className="-z-10 !h-[46%]" />
      <Particles count={16} seed={5} className="-z-10" />
      <div className="container-x py-24">
        <SectionHead title={d.tiers.title} subtitle={d.tiers.subtitle} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {tiers.map((t, i) => (
            <div
              key={t.id}
              data-reveal="3d"
              data-spotlight
              className={cn("card flex flex-col p-6", i === 2 && "bg-gradient-to-b from-primary/15 to-transparent")}
              style={delay(i * 90)}
            >
              <Neon tone={i === 2 ? "bright" : "soft"} twin={i === 2} phase={i * 0.21} speed={i === 2 ? 6 : 10} />
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
                <Link href={`/jobs?tier=${t.id}`} className={cn("btn btn-primary btn-sm px-2 text-xs", i === 2 && "btn-neon")}>
                  {d.tiers.jobsLink}
                </Link>
              </div>
            </div>
          ))}
        </div>
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
    <section data-anim className="container-x py-12">
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
            data-reveal="3d"
            style={delay((i % 4) * 90)}
            className={cn(
              "dark group relative isolate flex flex-col justify-end overflow-hidden rounded-[1.75rem] border border-line bg-[#06061a] p-5 text-fg",
              // toq sonli oxirgi karta mobil 2 ustunda yolg'iz qolmasin — keng karta bo'ladi
              i === cats.length - 1 && cats.length % 2 === 1 ? "col-span-2 aspect-[2/1]" : "aspect-square",
              WIDE.has(i) && "md:col-span-2 md:aspect-auto",
            )}
          >
            <Neon tone="soft" inside phase={(i * 0.37) % 1} speed={11} />
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
    <section data-anim className="container-x py-24">
      <SectionHead
        title={d.topEditors.title}
        action={
          <Link href="/editors" className="btn btn-ghost">
            {d.common.viewAll} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {editors.length === 0 ? (
        <div data-reveal className="card relative p-10 text-center text-muted">
          <Neon tone="soft" />
          {d.topEditors.empty}{" "}
          <Link href="/dashboard/profile" className="text-primary-2 underline">
            {d.nav.becomeEditor}
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {editors.map((e, i) => (
            <div key={e.id} data-reveal="3d" style={delay((i % 4) * 90)}>
              <EditorCard e={e} d={d} phase={i * 0.27} />
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
      <div data-reveal="fade" className="marquee -rotate-1" style={{ "--speed": "60s" } as React.CSSProperties}>
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

// ---------- Reyting tizimi (FXIFY: "Why choose" bento — ikonka, nurli ulanishlar, radar) ----------
export function RatingSection({ d }: { d: Dict }) {
  const items = [
    { icon: Star, pct: 60, tone: "var(--accent)", title: d.rating.quality, text: d.rating.qualityText },
    { icon: Clock, pct: 25, tone: "var(--primary-2)", title: d.rating.onTime, text: d.rating.onTimeText, radar: true },
    { icon: TrendingUp, pct: 15, tone: "var(--success)", title: d.rating.count, text: d.rating.countText },
  ];
  return (
    <section data-anim className="container-x py-24">
      <SectionHead eyebrow={d.rating.badge} title={d.rating.title} subtitle={d.rating.subtitle} />
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((it, i) => (
          <div
            key={it.title}
            data-reveal="3d"
            data-spotlight
            className="card flex flex-col overflow-hidden"
            style={{ "--tone": it.tone, "--d": `${i * 120}ms` } as Css}
          >
            <Neon tone="soft" inside phase={i * 0.33} speed={10} />
            <span className="corner-num">0.{i + 1}</span>
            <div className="bento-visual" aria-hidden>
              <div className="bento-grid" />
              <span className="link" style={{ "--ld": `${-i * 0.9}s` } as Css}>
                <i />
              </span>
              <span className="link link-r" style={{ "--ld": `${-i * 0.9 - 1.4}s` } as Css}>
                <i />
              </span>
              <span className="node" style={{ "--ld": `${-i * 0.9}s` } as Css} />
              <span className="node node-r" style={{ "--ld": `${-i * 0.9 - 1.4}s` } as Css} />
              {it.radar && (
                <span className="radar">
                  <i />
                  <i />
                  <i />
                </span>
              )}
              <span className="icon-tile">
                <it.icon className={cn("h-6 w-6", i === 0 && "fill-current")} />
              </span>
            </div>
            <div className="flex flex-1 flex-col px-7 pb-7">
              <div className="flex items-end justify-between gap-3">
                <p className="text-2xl font-light tracking-tight">{it.title}</p>
                <span className="text-5xl leading-none font-extralight tracking-tighter">
                  <CountUp to={it.pct} suffix="%" />
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{it.text}</p>
              <div className="mt-auto pt-6">
                {i === 0 && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className="pop h-6 w-6 fill-accent text-accent"
                        style={{ opacity: 0.4 + n * 0.12, "--i": n } as Css}
                      />
                    ))}
                  </div>
                )}
                {i === 1 && (
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className="grow-x h-full w-[92%] rounded-full bg-gradient-to-r from-primary to-primary-2 shadow-[0_0_12px_var(--primary-2)]" />
                  </div>
                )}
                {i === 2 && (
                  <div className="flex h-8 items-end gap-1">
                    {[30, 45, 38, 60, 52, 75, 68, 90, 82, 100].map((h, k) => (
                      <span
                        key={k}
                        className="grow-y flex-1 rounded-sm bg-gradient-to-t from-success/30 to-success"
                        style={{ height: `${h}%`, "--i": k } as Css}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- TOP rejalar ----------
export function PromoSection({ d, plans }: { d: Dict; plans: PromotionPlan[] }) {
  return (
    <section id="top" data-anim className="mx-2 scroll-mt-20 sm:mx-3">
      <div className="dark relative isolate overflow-hidden rounded-[2rem] border border-line bg-[#05050f] px-4 py-20 text-fg sm:px-8 lg:py-28">
        <Stars className="absolute inset-0 -z-10 opacity-60" />
        <Particles count={26} seed={17} className="-z-10" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-[radial-gradient(ellipse_50%_70%_at_50%_100%,rgba(61,76,228,0.45),transparent_70%)]" />
        <Floor className="-z-10 !h-[42%]" beams={9} />
        <div className="container-x !px-0 grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="h-section text-[clamp(2.4rem,5vw,4.4rem)] text-balance">
              <SplitText text={d.promo.title} wordClassName="text-silver" />
            </h2>
            <p data-reveal className="mt-5 max-w-md text-muted" style={delay(240)}>
              {d.promo.subtitle}
            </p>
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
                data-reveal="3d"
                data-spotlight
                style={delay(i * 120)}
                className={cn(
                  "card flex flex-col p-6",
                  p.isPopular && "bg-gradient-to-b from-primary/25 to-transparent sm:-translate-y-4",
                )}
              >
                {p.isPopular ? <Neon tone="accent" twin speed={6} /> : <Neon tone="soft" phase={i * 0.4} speed={9} />}
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
                  className={cn("btn mt-auto w-full", p.isPopular ? "btn-primary btn-neon" : "btn-ghost")}
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

// ---------- FAQ (FXIFY: yonib-o'chuvchi piksellar, chiziqlar chiziladi) ----------
export function FaqSection({ d }: { d: Dict }) {
  return (
    <section data-anim className="container-x grid gap-10 py-24 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="relative">
        <span data-reveal className="eyebrow mb-5">
          FAQ
        </span>
        <h2 className="h-section text-[clamp(2.2rem,4.5vw,3.8rem)] text-balance">
          <SplitText text={d.faq.title} wordClassName="text-silver" />
        </h2>
        <div data-reveal="fade" className="relative mt-12 hidden w-fit lg:block" style={delay(300)} aria-hidden>
          <PixelGrid />
          <span className="corner-glow -top-3 -left-3 rounded-tl-xl border-t border-l" />
          <span className="corner-glow -right-3 -bottom-3 rounded-br-xl border-r border-b [animation-delay:-2s]" />
        </div>
      </div>
      <div className="border-t border-line">
        {d.faq.items.map((f, i) => (
          <details key={f.q} className="faq group" data-reveal style={delay(i * 90)}>
            <summary className="flex items-center justify-between gap-6 py-6 text-lg font-light tracking-tight sm:text-xl">
              {f.q}
              <span className="faq-icon grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line transition-colors group-open:border-primary group-open:bg-primary group-open:text-white group-open:shadow-[0_0_20px_var(--glow)]">
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

// ---------- Yakuniy CTA (FXIFY: "Get started today" — 3D kabinet paneli + hamjamiyat kartalari) ----------
const MOCK_BARS = [32, 45, 38, 56, 50, 68, 62, 80, 74, 92, 86, 100];

function DashboardMock({ d }: { d: Dict }) {
  const menu = [
    { icon: LayoutDashboard, label: d.dashboard.overview },
    { icon: ClipboardList, label: d.dashboard.orders },
    { icon: Film, label: d.dashboard.portfolio },
    { icon: Wrench, label: d.dashboard.services },
    { icon: Rocket, label: d.dashboard.promote },
    { icon: Settings, label: d.dashboard.settings },
  ];
  const stats = [
    { label: d.dashboard.score, value: "92", unit: "/100" },
    { label: d.stats.rating, value: "4.9", unit: "★" },
    { label: d.stats.onTime, value: "98", unit: "%" },
    { label: d.stats.completed, value: "128", unit: "" },
  ];
  const rows = [
    { t: d.categories.reels, s: d.orderStatus.IN_PROGRESS, p: "$25", c: "bg-primary-2" },
    { t: d.categories.wedding, s: d.orderStatus.DELIVERED, p: "$45", c: "bg-accent" },
    { t: d.categories.youtube, s: d.orderStatus.COMPLETED, p: "$30", c: "bg-success" },
  ];
  return (
    <div
      aria-hidden
      className="relative rounded-[1.4rem] border border-white/10 bg-[#0a0a1f]/85 p-2 text-left shadow-[0_40px_120px_-30px_rgba(61,76,228,0.65)] backdrop-blur-xl"
    >
      <Neon tone="bright" speed={10} />
      <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
        <aside className="hidden flex-col gap-1 rounded-2xl bg-white/[0.03] p-3 sm:flex">
          <div className="flex items-center gap-2 px-1 pb-3">
            <LogoMark className="h-6 w-6" />
            <span className="text-sm tracking-tight">
              <span className="font-light">Montaj</span>
              <span className="font-semibold">chi</span>
            </span>
          </div>
          <span className="btn btn-primary btn-sm mb-3 h-8 w-full gap-1.5 text-[0.7rem]">
            <Plus className="h-3.5 w-3.5" /> {d.nav.postJob}
          </span>
          {menu.map((m, i) => (
            <span
              key={m.label}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[0.72rem]",
                i === 0 ? "bg-white/[0.07] text-fg" : "text-muted",
              )}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </span>
          ))}
        </aside>

        <div className="min-w-0 rounded-2xl bg-white/[0.02] p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3 text-[0.7rem] text-muted">
            <span className="truncate">
              {d.dashboard.title} <span className="mx-1 opacity-50">/</span> <span className="text-fg">{d.dashboard.overview}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="chip chip-accent h-5 px-2 text-[0.65rem]">
                <Flame className="h-2.5 w-2.5" /> TOP
              </span>
              <Bell className="h-3.5 w-3.5" />
              <span className="h-6 w-6 rounded-full bg-gradient-to-br from-primary-2 to-accent" />
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 text-lg font-light tracking-tight sm:text-xl">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06]">
                <LayoutDashboard className="h-4 w-4 text-primary-2" />
              </span>
              {d.dashboard.overview}
            </span>
            <span className="hidden items-center gap-2 sm:flex">
              <span className="btn btn-ghost btn-sm h-8 text-[0.7rem]">{d.dashboard.viewProfile}</span>
              <span className="btn btn-primary btn-sm h-8 text-[0.7rem]">
                <Rocket className="h-3.5 w-3.5" /> {d.dashboard.promote}
              </span>
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <p className="truncate text-[0.68rem] text-muted">{s.label}</p>
                <p className="mt-1.5 text-2xl font-extralight tracking-tight">
                  {s.value}
                  <span className="text-sm text-muted">{s.unit}</span>
                </p>
              </div>
            ))}
          </div>

          <div data-reveal="fade" className="mt-2 grid gap-2 md:grid-cols-[1.25fr_1fr]">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[0.68rem] text-muted">{d.stats.completed}</p>
              <div className="mt-3 flex h-24 items-end gap-1.5">
                {MOCK_BARS.map((h, i) => (
                  <span key={i} className="bar grow-y flex-1" style={{ height: `${h}%`, "--i": i } as Css} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[0.68rem] text-muted">{d.dashboard.asEditor}</p>
              <ul className="mt-2 space-y-1.5">
                {rows.map((r) => (
                  <li key={r.t} className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-2.5 py-2">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", r.c)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.72rem]">{r.t}</span>
                      <span className="block truncate text-[0.62rem] text-muted">{r.s}</span>
                    </span>
                    <span className="text-xs font-medium tabular-nums">{r.p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinalCta({ d }: { d: Dict }) {
  const cards = [
    { href: "/editors", icon: Search, ...d.cta.cards[0] },
    { href: "/orders/new", icon: Send, ...d.cta.cards[1] },
    { href: "/dashboard/profile", icon: Clapperboard, ...d.cta.cards[2] },
  ];
  return (
    <section data-anim className="container-x">
      <div className="dark relative isolate overflow-hidden rounded-[2rem] border border-line bg-[#05050f] text-fg">
        <Stars className="absolute inset-0 -z-10 opacity-50" />
        <div className="cta-grid absolute inset-0 -z-10" aria-hidden />
        <Particles count={22} seed={29} className="-z-10" />

        <div className="relative px-5 pt-20 text-center sm:px-10 lg:pt-28">
          <span data-reveal className="eyebrow pl-1.5 before:hidden">
            <LogoMark className="h-4 w-4" /> Montajchi
          </span>
          <h2 className="h-section mx-auto mt-6 max-w-4xl text-[clamp(2.4rem,5.4vw,4.6rem)] text-balance">
            <SplitText text={d.cta.title} wordClassName="text-silver" stagger={80} />
          </h2>
          <p data-reveal className="mx-auto mt-5 max-w-xl text-muted" style={delay(260)}>
            {d.cta.subtitle}
          </p>
        </div>

        {/* Kabinet paneli: skroll bilan 3D qiyalikdan tekislanadi, orqasida planeta ufqi */}
        <div className="relative mt-14 px-3 sm:px-8 lg:px-14">
          <div className="cta-arc top-10" aria-hidden />
          <div className="mock-stage relative mx-auto max-w-5xl">
            <div className="mock-tilt [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]">
              <DashboardMock d={d} />
            </div>
          </div>
        </div>

        {/* Hamjamiyat kartalari: markazda ikonka, sxema chiziqlari bo'ylab nur yuguradi */}
        <div className="relative -mt-6 grid gap-3 px-3 pb-3 sm:grid-cols-3 sm:px-8 sm:pb-8 lg:px-14 lg:pb-14">
          {cards.map((c, i) => (
            <Link
              key={c.href}
              href={c.href}
              data-reveal="3d"
              style={delay(i * 120)}
              className="group relative isolate flex flex-col items-center rounded-3xl border border-line bg-[#0a0a1f]/80 px-5 pt-3 pb-6 text-center backdrop-blur-md transition hover:border-line-strong"
            >
              <Neon tone={i === 1 ? "bright" : "soft"} phase={i * 0.3} speed={i === 1 ? 6 : 9} />
              <span
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-36 rounded-t-[inherit] bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(61,76,228,0.4),transparent_70%)]"
                aria-hidden
              />
              <div className="relative grid h-28 w-full place-items-center" aria-hidden>
                <svg viewBox="0 0 240 112" className="absolute inset-0 h-full w-full" fill="none">
                  <path className="circuit-line" d="M92 56H62L48 40H14" />
                  <path className="circuit-line" d="M148 56H178L192 72H226" />
                  <path className="circuit-beam" pathLength={100} d="M92 56H62L48 40H14" style={{ "--cd": `${-i * 0.8}s` } as Css} />
                  <path
                    className="circuit-beam"
                    pathLength={100}
                    d="M148 56H178L192 72H226"
                    style={{ "--cd": `${-i * 0.8 - 1.5}s` } as Css}
                  />
                  <circle className="circuit-dot" cx="14" cy="40" r="2.5" style={{ "--cd": `${-i * 0.8}s` } as Css} />
                  <circle className="circuit-dot" cx="226" cy="72" r="2.5" style={{ "--cd": `${-i * 0.8 - 1.5}s` } as Css} />
                </svg>
                <span className="circuit-icon">
                  <c.icon className="h-5 w-5" />
                </span>
              </div>
              <h3 className="mt-2 text-xl font-light tracking-tight">{c.t}</h3>
              <p className="mt-1.5 max-w-[18rem] text-sm leading-relaxed text-muted">{c.d}</p>
              <span className={cn("btn btn-sm mt-5", i === 1 ? "btn-primary btn-neon" : "btn-ghost")}>
                {c.cta} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
