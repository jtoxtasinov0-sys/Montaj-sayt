import { ArrowRight, Check, Repeat, Users, Zap } from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/client-effects";
import { EditorCard } from "@/components/editor-card";
import { StackCards, type StackCardItem } from "@/components/home/stack-cards";
import { GlyphIcon, SplitText } from "@/components/motion";
import type { PriceTier, PromotionPlan } from "@/db/schema";
import { HOME_TOP_COUNT, SOFTWARE, TOP_ROTATE_MINUTES } from "@/lib/constants";
import type { EditorCardData } from "@/lib/data";
import { fmt, type Dict } from "@/lib/i18n";
import { cn, formatUzs } from "@/lib/utils";

type Css = React.CSSProperties & Record<`--${string}`, string | number>;
/** Ketma-ket paydo bo'lish kechikishi */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as Css;

/** Bo'limlar orasidagi ingichka chiziq — ko'rinishga kirganda chapdan o'ngga chiziladi */
function Rule({ className }: { className?: string }) {
  return <span data-reveal="line" aria-hidden className={cn("block h-px bg-line-strong", className)} />;
}

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
        <h2 className="h-section text-[clamp(2.2rem,5vw,4rem)] text-balance">
          <SplitText text={title} />
        </h2>
        {subtitle && (
          <p data-reveal className="mt-4 max-w-xl text-muted" style={delay(180)}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div data-reveal style={delay(260)}>
          {action}
        </div>
      )}
    </div>
  );
}

// ---------- Dasturlar (oq-qora yugurik qator) ----------
export function SoftwareMarquee() {
  const items = [...SOFTWARE, ...SOFTWARE];
  return (
    <div data-anim className="marquee border-y border-line py-6" style={{ "--speed": "55s" } as React.CSSProperties}>
      {[0, 1].map((k) => (
        <div key={k} className="marquee-track" aria-hidden={k === 1}>
          {items.map((s, i) => (
            <span key={i} className="flex items-center gap-3 text-xl font-light tracking-tight text-muted">
              <span className="h-1 w-1 rounded-full bg-current" />
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
    <section className="container-x pt-16">
      <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
        {items.map((it, i) => (
          <div key={it.label} data-reveal className="pr-4" style={delay(i * 90)}>
            <div className="text-5xl font-light tracking-tight sm:text-6xl">
              <CountUp to={it.v} decimals={it.decimals ?? 0} suffix={it.suffix} />
            </div>
            <div className="mt-2 text-sm text-muted">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Hozir eng ko'p tanlanayotganlar (TOP + reyting) ----------
export function TopEditorsSection({ d, editors }: { d: Dict; editors: EditorCardData[] }) {
  return (
    <section data-rb-shape="b" className="container-x pt-28 sm:pt-40 lg:pt-52">
      <Rule className="mb-12" />
      <SectionHead
        title={d.topEditors.title}
        action={
          <Link href="/editors" className="btn btn-ghost">
            {d.common.viewAll} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {editors.length === 0 ? (
        <div data-reveal className="card p-10 text-center text-muted">
          {d.topEditors.empty}{" "}
          <Link href="/dashboard/profile" className="text-fg underline">
            {d.nav.becomeEditor}
          </Link>
        </div>
      ) : (
        // Telefonda — yonga suriladigan qator (20 ta kartani uzun ustunga tizmaslik uchun), kattaroq ekranda — to'r
        <div
          className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden"
        >
          {editors.map((e, i) => (
            <div key={e.id} data-reveal className="w-[84%] shrink-0 snap-start sm:w-auto" style={delay((i % 4) * 80)}>
              <EditorCard e={e} d={d} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Narx bo'limlari: yonma-yon kartalar (oldingi joylashuv), oq-qora ----------
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
    <section className="container-x pt-28">
      <Rule className="mb-12" />
      <SectionHead title={d.tiers.title} subtitle={d.tiers.subtitle} />
      {/* Telefonda ikki ustun (uzun ro'yxat bo'lmasin), toq oxirgi karta to'liq kenglikda */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiers.map((t, i) => (
          <div
            key={t.id}
            data-reveal
            style={delay(i * 80)}
            className="card flex flex-col p-4 transition duration-300 hover:-translate-y-1 hover:border-fg max-sm:last:odd:col-span-2 sm:p-6"
          >
            <div className="text-[2rem] leading-none font-light tracking-tight sm:text-[2.6rem]">
              ${t.minUsd}
              <span className="text-muted">{t.maxUsd ? `–${t.maxUsd}` : "+"}</span>
            </div>
            {/* Barcha kartalarda bir xil balandlik — qatorlar bir chiziqda turadi */}
            <div className="mt-1.5 h-4 text-xs text-muted">{!t.maxUsd && d.tiers.plus}</div>
            <div className="my-5 space-y-1.5 text-sm text-muted sm:my-6">
              <div className="flex justify-between">
                <span>{d.tiers.editorsLink}</span>
                <span className="text-fg">{counts[t.id]?.editors ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{d.tiers.jobsLink}</span>
                <span className="text-fg">{counts[t.id]?.jobs ?? 0}</span>
              </div>
            </div>
            <div className="mt-auto grid gap-2 sm:grid-cols-2">
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

// ---------- Montaj jarayoni (lusion.co "Featured Work" uslubi) ----------
/** Gemini'da generatsiya qilingan realistik suratlar ("desk setup" uslubi): har bir yo'nalishda montaj qilayotgan montajorlar */
const WORK_PHOTOS = [
  { key: "reels", src: "/images/work/reels-v3.webp" },
  { key: "youtube", src: "/images/work/youtube-v4.webp" },
  { key: "color", src: "/images/work/color-v3.webp" },
  { key: "motion", src: "/images/work/motion-v3.webp" },
  { key: "podcast", src: "/images/work/podcast-v3.webp" },
  { key: "ads", src: "/images/work/ads-v3.webp" },
] as const;

export function ShowcaseSection({ d }: { d: Dict }) {
  return (
    <section data-rb-shape="b" className="container-x pt-28 sm:pt-40 lg:pt-52">
      <Rule className="mb-12" />
      <SectionHead
        title={d.showcase.title}
        subtitle={d.showcase.subtitle}
        action={
          <Link href="/editors" className="btn btn-ghost">
            {d.common.viewAll} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {/* Ikki ustun, o'ng ustun pastroqda (zinapoya) */}
      <div className="grid gap-x-5 gap-y-12 md:grid-cols-2 md:gap-y-16">
        {WORK_PHOTOS.map((it, i) => (
          <Link key={it.key} href={`/editors?category=${it.key}`} className={cn("work group block", i % 2 === 1 && "md:mt-24")}>
            <div className="work-media aspect-[16/9]">
              <div className="work-zoom">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.src}
                  alt={fmt(d.showcase.alt, { category: d.categories[it.key] })}
                  width={1376}
                  height={774}
                  loading="lazy"
                  decoding="async"
                  className="work-img"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="flex min-w-0 items-center text-xl tracking-tight sm:text-2xl">
                <ArrowRight className="work-arrow h-[0.9em]" />
                <span className="truncate">{d.categories[it.key]}</span>
              </h3>
              <span className="text-xs text-muted">
                {String(i + 1).padStart(2, "0")} · {d.showcase.see}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------- Mijozlar fikri (cuberto.com "Trusted by our clients" uslubi) ----------
export type ReviewItem = { id: string; comment: string; rating: number; authorName: string; editorName: string; slug: string };
/** Har bir karta o'z burchagi bilan qiyshayib kirib keladi */
const TILT = ["-7deg", "4deg", "9deg", "-5deg", "7deg", "-9deg"];

export function ReviewsSection({ d, items }: { d: Dict; items: ReviewItem[] }) {
  if (items.length < 3) return null;
  const list = items.slice(0, items.length >= 6 ? 6 : 3);
  return (
    <section className="container-x pt-28">
      <Rule className="mb-12" />
      <h2 className="h-section mx-auto max-w-3xl text-center text-[clamp(2.2rem,5vw,4rem)] text-balance">
        <SplitText text={d.reviewsSection.title} />
      </h2>
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {list.map((r, i) => (
          <figure
            key={r.id}
            className={cn("review-card flex flex-col p-7 sm:p-8", i % 3 !== 1 && "md:mt-10")}
            style={{ "--pc": `var(--pastel-${(i % 3) + 1})`, "--r": TILT[i % TILT.length], "--ty": `${120 + (i % 3) * 40}px` } as Css}
          >
            <span aria-hidden className="text-5xl leading-none font-semibold text-fg/25">“</span>
            <blockquote className="mt-2 text-[0.98rem] leading-relaxed">{r.comment}</blockquote>
            <span className="mt-6 block h-px w-10 bg-fg/30" />
            <figcaption className="mt-4 text-sm">
              <span className="font-medium">{r.authorName}</span>
              <Link href={`/editors/${r.slug}`} className="mt-0.5 block text-muted hover:underline">
                {fmt(d.reviewsSection.forEditor, { name: r.editorName })}
              </Link>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

// ---------- Qanday ishlaydi: mijozlar va montajorlar uchun alohida ----------
const CLIENT_ICONS = ["c-choose", "c-order", "c-result", "c-rate"];
const EDITOR_ICONS = ["e-login", "e-portfolio", "e-clients", "e-top"];

function HowCard({
  label,
  lead,
  steps,
  icons,
  ctas,
}: {
  label: string;
  lead: string;
  steps: { t: string; d: string }[];
  icons: string[];
  ctas: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div data-reveal className="card flex flex-col p-6 sm:p-10">
      <span className="eyebrow">{label}</span>
      <p className="mt-5 max-w-md text-2xl leading-snug font-light tracking-tight sm:text-3xl">{lead}</p>
      <ol className="mt-8 flex-1">
        {steps.map((s, i) => (
          <li key={s.t} className="glyph-host grid grid-cols-[3.25rem_1fr] items-start gap-4 border-t border-line py-5">
            <GlyphIcon name={icons[i]} className="h-12 w-12" />
            <div>
              <p className="flex items-baseline gap-2 text-lg font-medium tracking-tight">
                <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                {s.t}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-6">
        {ctas.map((c) => (
          <Link key={c.href} href={c.href} className={cn("btn", c.primary ? "btn-primary" : "btn-ghost")}>
            {c.label} <ArrowRight className="h-4 w-4" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks({ d }: { d: Dict }) {
  return (
    <section id="how" className="container-x scroll-mt-24 pt-28">
      <Rule className="mb-12" />
      <SectionHead title={d.how.title} />
      <div className="grid gap-4 lg:grid-cols-2">
        <HowCard
          label={d.how.forClients}
          lead={d.how.clientLead}
          steps={d.how.client}
          icons={CLIENT_ICONS}
          ctas={[
            { href: "/editors", label: d.how.clientCta, primary: true },
            { href: "/orders/new", label: d.how.clientCta2 },
          ]}
        />
        <HowCard
          label={d.how.forEditors}
          lead={d.how.editorLead}
          steps={d.how.editor}
          icons={EDITOR_ICONS}
          ctas={[
            { href: "/dashboard/profile", label: d.how.editorCta, primary: true },
            { href: "/#top", label: d.how.editorCta2 },
          ]}
        />
      </div>
    </section>
  );
}

// ---------- TOP: bitta tarif ----------
export function PromoSection({ d, plans }: { d: Dict; plans: PromotionPlan[] }) {
  const m = TOP_ROTATE_MINUTES;
  const slots = plans[0]?.slots || HOME_TOP_COUNT;
  return (
    <section id="top" className="container-x scroll-mt-24 pt-28">
      <Rule className="mb-12" />
      <div className="grid items-start gap-12 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-20">
        <div className="glyph-host" data-reveal>
          <GlyphIcon name="e-top" className="h-16 w-16" />
          <h2 className="h-section mt-8 text-[clamp(2.4rem,5vw,4.4rem)] text-balance">
            <SplitText text={d.promo.title} />
          </h2>
          <p className="mt-5 max-w-lg text-lg text-muted">{d.promo.subtitle}</p>
          <p className="mt-8 max-w-lg border-t border-line pt-6 text-sm leading-relaxed text-muted">
            {fmt(d.promo.howNote, { m, n: slots })}
          </p>
        </div>

        <div className={cn("grid gap-3", plans.length > 1 && "sm:grid-cols-2 lg:grid-cols-1")}>
          {plans.map((p, i) => (
            <div
              key={p.id}
              data-reveal
              style={delay(120 + i * 90)}
              className={cn("rounded-[1.5rem] p-7 sm:p-9", i === 0 ? "panel-invert" : "border border-line")}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">{p.name}</span>
                {p.slots > 0 && (
                  <span className="chip">
                    <Users className="h-3 w-3" /> {fmt(d.promo.slots, { n: p.slots })}
                  </span>
                )}
              </div>
              <div className="mt-8 text-[clamp(3rem,7vw,4.6rem)] leading-none font-light tracking-tight">
                {formatUzs(p.priceUzs)}
                <span className="ml-2 text-lg text-muted">{d.common.uzs}</span>
              </div>
              <div className="mt-2 text-muted">/ {fmt(d.promo.perDays, { days: p.days })}</div>
              <ul className="my-8 space-y-3 text-sm">
                {d.promo.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0" /> {f}
                  </li>
                ))}
                <li className="flex items-center gap-2.5">
                  <Repeat className="h-4 w-4 shrink-0" /> {fmt(d.promo.rotation, { m })}
                </li>
                <li className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 shrink-0" /> {d.promo.auto}
                </li>
              </ul>
              <Link href="/dashboard/promote" className="btn btn-primary btn-lg w-full">
                {d.promo.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- FAQ: taxlanadigan kartalar (cuberto.com "What we do" uslubi, egasi yuborgan video bo'yicha) ----------
export function FaqSection({ d }: { d: Dict }) {
  const items: StackCardItem[] = d.faq.items.map((f, i) => ({ key: String(i), title: f.q, text: f.a }));
  return (
    <section id="faq" className="container-x scroll-mt-24 pt-28">
      <Rule className="mb-12" />
      <SectionHead eyebrow="FAQ" title={d.faq.title} />
      <StackCards items={items} />
    </section>
  );
}
