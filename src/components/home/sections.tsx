import { ArrowRight, ArrowUpRight, Check, Plus, Repeat, Users, Zap } from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/client-effects";
import { EditorCard } from "@/components/editor-card";
import { GlyphIcon, SplitText } from "@/components/motion";
import type { PriceTier, PromotionPlan } from "@/db/schema";
import { CATEGORIES, HOME_TOP_COUNT, SOFTWARE, TOP_ROTATE_MINUTES } from "@/lib/constants";
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
    <section className="container-x pt-28">
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
        <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
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

// ---------- Narx bo'limlari: katta, tushunarli qatorlar ----------
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
      <div>
        {tiers.map((t, i) => (
          <div key={t.id} data-reveal style={delay(i * 70)} className="border-t border-line">
            <div className="grid items-center gap-x-6 gap-y-4 py-7 sm:py-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto]">
              <div className="flex items-baseline gap-3">
                <span className="text-[clamp(2.6rem,6vw,4.4rem)] leading-none font-light tracking-tight">
                  ${t.minUsd}
                  {t.maxUsd ? `–${t.maxUsd}` : "+"}
                </span>
                {!t.maxUsd && <span className="text-sm text-muted">{d.tiers.plus}</span>}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-base text-muted sm:text-lg">
                <span>{fmt(d.tiers.editorsCount, { n: counts[t.id]?.editors ?? 0 })}</span>
                <span>{fmt(d.tiers.jobsCount, { n: counts[t.id]?.jobs ?? 0 })}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Link href={`/editors?tier=${t.id}`} className="btn btn-ghost">
                  {d.tiers.editorsLink} <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link href={`/jobs?tier=${t.id}`} className="btn btn-primary">
                  {d.tiers.jobsLink} <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Yo'nalishlar: ixcham plitkalar, Gemini'da chizilgan ingichka ikonkalar ----------
export function CategoriesSection({ d }: { d: Dict }) {
  const cats = CATEGORIES.filter((c) => c.key !== "other");
  return (
    <section className="container-x pt-28">
      <Rule className="mb-12" />
      <SectionHead
        title={d.categoriesSection.title}
        action={
          <Link href="/editors" className="btn btn-ghost">
            {d.common.viewAll} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cats.map((c, i) => (
          <Link
            key={c.key}
            href={`/editors?category=${c.key}`}
            data-reveal
            style={delay(i * 70)}
            className="glyph-host card group flex flex-col justify-between gap-8 p-5 transition-colors duration-300 hover:border-fg"
          >
            <span className="flex items-start justify-between">
              <GlyphIcon name={c.icon} className="h-14 w-14" />
              <ArrowUpRight className="h-4 w-4 text-muted transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" />
            </span>
            <span className="text-base leading-tight sm:text-lg">{d.categories[c.key]}</span>
          </Link>
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

// ---------- FAQ ----------
export function FaqSection({ d }: { d: Dict }) {
  return (
    <section className="container-x pt-28">
      <Rule className="mb-12" />
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <span data-reveal className="eyebrow mb-5">
            FAQ
          </span>
          <h2 className="h-section text-[clamp(2.2rem,4.5vw,3.8rem)] text-balance">
            <SplitText text={d.faq.title} />
          </h2>
        </div>
        <div className="border-t border-line">
          {d.faq.items.map((f, i) => (
            <details key={f.q} className="faq group border-b border-line" data-reveal style={delay(i * 70)}>
              <summary className="flex items-center justify-between gap-6 py-6 text-lg tracking-tight sm:text-xl">
                {f.q}
                <span className="faq-icon grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong transition-colors group-open:border-fg group-open:bg-fg group-open:text-bg">
                  <Plus className="h-4 w-4" />
                </span>
              </summary>
              <p className="max-w-2xl pb-6 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Yakuniy CTA: katta matn va uchta havola-qator ----------
export function FinalCta({ d }: { d: Dict }) {
  const links = [
    { href: "/editors", ...d.cta.cards[0] },
    { href: "/orders/new", ...d.cta.cards[1] },
    { href: "/dashboard/profile", ...d.cta.cards[2] },
  ];
  return (
    <section className="container-x pt-28">
      <Rule className="mb-12" />
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div>
          <h2 className="h-section text-[clamp(2.6rem,6vw,5.2rem)] text-balance">
            <SplitText text={d.cta.title} stagger={60} />
          </h2>
          <p data-reveal className="mt-5 max-w-md text-muted" style={delay(200)}>
            {d.cta.subtitle}
          </p>
        </div>
        <div className="border-t border-line">
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              data-reveal
              style={delay(i * 90)}
              className="group flex items-center justify-between gap-6 border-b border-line py-5"
            >
              <span>
                <span className="block text-xl tracking-tight sm:text-2xl">{l.t}</span>
                <span className="mt-1 block text-sm text-muted">{l.d}</span>
              </span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-strong transition duration-300 group-hover:border-fg group-hover:bg-fg group-hover:text-bg">
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
