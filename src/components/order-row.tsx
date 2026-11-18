import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "./page-bits";

export function OrderRow({
  o,
  d,
  locale,
  who,
}: {
  o: { id: string; title: string; status: string; budgetUsd: number; agreedPriceUsd: number | null; deadline: Date };
  d: Dict;
  locale: string;
  who?: string | null;
}) {
  return (
    <Link
      href={`/orders/${o.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3.5 transition hover:border-line-strong sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium group-hover:text-primary-2">{o.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {who ? `${who} · ` : ""}
          {d.order.deadline}: {formatDate(o.deadline, locale)}
        </p>
        {/* Telefonda holat sarlavha ostida — aks holda uzun holat nomi sarlavhani siqib qo'yadi */}
        <div className="mt-2 flex items-center gap-2 sm:hidden">
          <StatusBadge status={o.status} label={d.orderStatus[o.status]} />
          <span className="text-sm">${o.agreedPriceUsd ?? o.budgetUsd}</span>
        </div>
      </div>
      <StatusBadge status={o.status} label={d.orderStatus[o.status]} className="max-sm:hidden" />
      <span className="hidden w-16 text-right text-sm sm:block">${o.agreedPriceUsd ?? o.budgetUsd}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
