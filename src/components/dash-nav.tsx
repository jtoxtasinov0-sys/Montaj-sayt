"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PillTrack } from "./pill-track";

export function DashNav({ items }: { items: { href: string; label: string; badge?: number; icon?: React.ReactNode }[] }) {
  const path = usePathname();
  // Telefonda faol bo'lim ekrandan tashqarida qolsa — PillTrack uni markazga suradi (sahifa o'zi siljimaydi)
  return (
    <PillTrack className="-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] max-md:[mask-image:linear-gradient(90deg,transparent,#000_14px,#000_calc(100%-24px),transparent)] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
        const active = it.href === path || (it.href !== "/dashboard" && it.href !== "/admin" && path.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            data-pill
            aria-current={active ? "page" : undefined}
            className="pill-item inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm"
          >
            {it.icon}
            {it.label}
            {!!it.badge && (
              // Qizil — e'tibor talab qiladi (faol, qora tugma ustida ham ko'rinadi)
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.7rem] font-semibold text-white">
                {it.badge}
              </span>
            )}
          </Link>
        );
      })}
    </PillTrack>
  );
}
