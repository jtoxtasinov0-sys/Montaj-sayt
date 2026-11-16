import { Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminStat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "accent" | "success" | "primary" }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-light tracking-tight",
          tone === "accent" && "text-accent",
          tone === "success" && "text-success",
          tone === "primary" && "text-primary-2",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function AdminSearch({ action, q, placeholder, children }: { action: string; q?: string; placeholder: string; children?: React.ReactNode }) {
  return (
    <form method="get" action={action} className="mb-5 flex flex-wrap gap-2">
      <div className="relative min-w-[16rem] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder={placeholder} maxLength={80} className="input pl-10" />
      </div>
      {children}
      <button className="btn btn-primary">Qidirish</button>
    </form>
  );
}

export function FilterTabs({ base, current, items }: { base: string; current?: string; items: { value?: string; label: string }[] }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {items.map((it) => (
        <Link
          key={it.label}
          href={it.value ? `${base}?status=${it.value}` : base}
          className={cn("chip h-8 px-3.5 text-xs", current === it.value && "chip-primary")}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
