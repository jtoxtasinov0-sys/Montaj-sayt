"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function DashNav({ items }: { items: { href: string; label: string; badge?: number; icon?: React.ReactNode }[] }) {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  // Telefonda faol bo'lim ekrandan tashqarida qolmasin — uni markazga suramiz (sahifa o'zi siljimaydi)
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2, behavior: "smooth" });
  }, [path]);
  return (
    <nav
      ref={ref}
      className="-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] max-md:[mask-image:linear-gradient(90deg,transparent,#000_14px,#000_calc(100%-24px),transparent)] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((it) => {
        const active = it.href === path || (it.href !== "/dashboard" && it.href !== "/admin" && path.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition",
              active ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {it.icon}
            {it.label}
            {!!it.badge && (
              // Qizil — e'tibor talab qiladi (faol, qora tugma ustida ham ko'rinadi)
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.7rem] font-semibold text-white">{it.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
