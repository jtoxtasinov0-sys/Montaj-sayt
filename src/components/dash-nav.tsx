"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DashNav({ items }: { items: { href: string; label: string; badge?: number }[] }) {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {items.map((it) => {
        const active = it.href === path || (it.href !== "/dashboard" && it.href !== "/admin" && path.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition",
              active ? "bg-fg text-bg" : "text-muted hover:bg-card-2 hover:text-fg",
            )}
          >
            {it.label}
            {!!it.badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.7rem] font-semibold text-black">{it.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
