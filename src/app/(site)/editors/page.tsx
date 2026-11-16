import { Search, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EditorCard } from "@/components/editor-card";
import { Empty, PageHero, Pagination } from "@/components/page-bits";
import { CATEGORY_KEYS, LEVELS } from "@/lib/constants";
import { getTiers, listEditors, tierLabel } from "@/lib/data";
import { fmt, getDict } from "@/lib/i18n";
import { clampInt, cn } from "@/lib/utils";

type SP = { q?: string; tier?: string; category?: string; level?: string; sort?: string; page?: string };

export async function generateMetadata(): Promise<Metadata> {
  const d = await getDict();
  return { title: d.editors.title, description: d.editors.subtitle };
}

export default async function EditorsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = {
    q: (sp.q ?? "").trim().slice(0, 60) || undefined,
    tier: sp.tier ? clampInt(sp.tier, 1, 1_000_000, 0) || undefined : undefined,
    category: (CATEGORY_KEYS as readonly string[]).includes(sp.category ?? "") ? sp.category : undefined,
    level: (LEVELS as readonly string[]).includes(sp.level ?? "") ? sp.level : undefined,
    sort: ["top", "rating", "new", "price_asc", "price_desc"].includes(sp.sort ?? "") ? sp.sort : undefined,
    page: clampInt(sp.page, 1, 500, 1),
  };
  const [d, tiers, res] = await Promise.all([getDict(), getTiers(), listEditors(filters)]);

  const qs = (over: Partial<Record<keyof SP, string | number | undefined>>) => {
    const p = new URLSearchParams();
    const merged = { ...filters, ...over } as Record<string, unknown>;
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return `/editors${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHero eyebrow={d.nav.editors} title={d.editors.title} subtitle={d.editors.subtitle}>
        <div className="flex flex-wrap gap-2">
          <Link href={qs({ tier: undefined, page: 1 })} className={cn("chip h-9 px-4 text-sm", !filters.tier && "chip-primary")}>
            {d.common.all}
          </Link>
          {tiers.map((t) => (
            <Link
              key={t.id}
              href={qs({ tier: t.id, page: 1 })}
              className={cn("chip h-9 px-4 text-sm", filters.tier === t.id && "chip-primary")}
            >
              {tierLabel(t)}
            </Link>
          ))}
        </div>
      </PageHero>

      <div className="container-x mt-8">
        <form method="get" action="/editors" className="card grid gap-3 p-3 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
          {filters.tier && <input type="hidden" name="tier" value={filters.tier} />}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={filters.q}
              placeholder={d.editors.searchPlaceholder}
              maxLength={60}
              className="input pl-10"
              aria-label={d.common.search}
            />
          </div>
          <select name="category" defaultValue={filters.category ?? ""} className="input" aria-label={d.editors.category}>
            <option value="">{d.editors.category}: {d.common.all}</option>
            {CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>
                {d.categories[c]}
              </option>
            ))}
          </select>
          <select name="level" defaultValue={filters.level ?? ""} className="input" aria-label={d.editors.level}>
            <option value="">{d.editors.level}: {d.common.all}</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {d.levels[l]}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={filters.sort ?? "top"} className="input" aria-label={d.editors.sort}>
            <option value="top">{d.editors.sortTop}</option>
            <option value="rating">{d.editors.sortRating}</option>
            <option value="new">{d.editors.sortNew}</option>
            <option value="price_asc">{d.editors.sortPriceAsc}</option>
            <option value="price_desc">{d.editors.sortPriceDesc}</option>
          </select>
          <button className="btn btn-primary">
            <SlidersHorizontal className="h-4 w-4" /> {d.common.apply}
          </button>
        </form>

        <div className="mt-8 mb-4 flex items-center justify-between text-sm text-muted">
          <span>{fmt(d.editors.results, { n: res.total })}</span>
          {(filters.q || filters.category || filters.level || filters.tier) && (
            <Link href="/editors" className="hover:text-fg">
              {d.common.reset}
            </Link>
          )}
        </div>

        {res.items.length === 0 ? (
          <Empty>{d.editors.empty}</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {res.items.map((e) => (
              <EditorCard key={e.id} e={e} d={d} />
            ))}
          </div>
        )}
        <Pagination page={res.page} pages={res.pages} href={(p) => qs({ page: p })} labels={{ prev: d.common.prev, next: d.common.next }} />
      </div>
    </>
  );
}
