import { CalendarClock, MessageSquare, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Empty, PageHero, Pagination } from "@/components/page-bits";
import { CATEGORY_KEYS } from "@/lib/constants";
import { getTiers, listOpenJobs, tierLabel } from "@/lib/data";
import { fmt, getDict, getLocale } from "@/lib/i18n";
import { clampInt, cn, formatDate } from "@/lib/utils";

type SP = { tier?: string; category?: string; page?: string };

export async function generateMetadata(): Promise<Metadata> {
  const d = await getDict();
  return { title: d.jobs.title, description: d.jobs.subtitle };
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = {
    tier: sp.tier ? clampInt(sp.tier, 1, 1_000_000, 0) || undefined : undefined,
    category: (CATEGORY_KEYS as readonly string[]).includes(sp.category ?? "") ? sp.category : undefined,
    page: clampInt(sp.page, 1, 500, 1),
  };
  const [d, locale, tiers, res] = await Promise.all([getDict(), getLocale(), getTiers(), listOpenJobs(f)]);
  const qs = (over: Partial<typeof f>) => {
    const m = { ...f, ...over };
    const p = new URLSearchParams();
    if (m.tier) p.set("tier", String(m.tier));
    if (m.category) p.set("category", m.category);
    if (m.page && m.page > 1) p.set("page", String(m.page));
    const s = p.toString();
    return `/jobs${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHero eyebrow={d.tiers.eyebrow} title={d.jobs.title} subtitle={d.jobs.subtitle}>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={qs({ tier: undefined, page: 1 })} className={cn("chip h-9 px-4 text-sm", !f.tier && "chip-primary")}>
            {d.common.all}
          </Link>
          {tiers.map((t) => (
            <Link key={t.id} href={qs({ tier: t.id, page: 1 })} className={cn("chip h-9 px-4 text-sm", f.tier === t.id && "chip-primary")}>
              {tierLabel(t)}
            </Link>
          ))}
          <Link href="/orders/new" className="btn btn-primary btn-sm ml-auto">
            <Plus className="h-4 w-4" /> {d.jobs.post}
          </Link>
        </div>
      </PageHero>

      <div className="container-x mt-8">
        <div className="mb-6 flex flex-wrap gap-1.5">
          <Link href={qs({ category: undefined, page: 1 })} className={cn("chip", !f.category && "chip-primary")}>
            {d.common.all}
          </Link>
          {CATEGORY_KEYS.map((c) => (
            <Link key={c} href={qs({ category: c, page: 1 })} className={cn("chip", f.category === c && "chip-primary")}>
              {d.categories[c]}
            </Link>
          ))}
        </div>

        {res.items.length === 0 ? (
          <Empty>
            <p>{d.jobs.empty}</p>
            <Link href="/orders/new" className="btn btn-primary btn-sm mt-4">
              {d.jobs.post}
            </Link>
          </Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {res.items.map((j) => (
              <Link key={j.id} href={`/orders/${j.id}`} data-spotlight className="card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:border-line-strong">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="chip mb-2">{d.categories[j.category] ?? j.category}</span>
                    <h3 className="text-lg font-medium tracking-tight group-hover:text-primary-2">{j.title}</h3>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-3xl font-light tracking-tight">${j.budgetUsd}</div>
                    <div className="text-xs text-muted">{d.jobs.budget}</div>
                  </div>
                </div>
                <p className="line-clamp-2 text-sm text-muted">{j.description}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" /> {d.jobs.deadline}: {formatDate(j.deadline, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> {fmt(d.jobs.proposals, { n: j.proposalCount })}
                  </span>
                  <span className="ml-auto">
                    {j.clientName} · {formatDate(j.createdAt, locale)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Pagination page={res.page} pages={res.pages} href={(p) => qs({ page: p })} labels={{ prev: d.common.prev, next: d.common.next }} />
      </div>
    </>
  );
}
