"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { pageScrollY, useScrollLock } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import { PillTrack } from "./pill-track";

type NavItem = { href: string; label: string };

/** Yuqori panel: tepada shaffof, skroll qilinganda fon va pastki ingichka chiziq paydo bo'ladi */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    // Menyu/video ochiq bo'lsa sahifa qulflangan (window.scrollY = 0) — header ko'rinishi o'zgarmasin
    const on = () => setScrolled(pageScrollY() > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={cn(
        "hdr-in fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "glass border-x-0 border-t-0 py-2" : "border-b border-transparent py-4",
      )}
    >
      {children}
    </header>
  );
}

export function NavPills({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <PillTrack className="hidden items-center gap-1 lg:flex">
      {items.map((it, i) => {
        const active = it.href !== "/" && path.startsWith(it.href.split("#")[0]) && !it.href.includes("#");
        return (
          <Link
            key={it.href}
            href={it.href}
            data-pill
            aria-current={active ? "page" : undefined}
            style={{ "--n": i } as React.CSSProperties}
            className="pill-item rounded-full px-4 py-1.5 text-[0.84rem]"
          >
            {it.label}
          </Link>
        );
      })}
    </PillTrack>
  );
}

export function MobileMenu({ items, footer, label }: { items: NavItem[]; footer: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useScrollLock(open);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-full border border-line"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <div className="fixed inset-x-0 top-[64px] bottom-0 z-40 overflow-y-auto bg-bg px-4 pt-6 pb-10 fade-up">
          <nav className="flex flex-col">
            {items.map((it, i) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="h-section border-b border-line py-4 text-3xl fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-4">{footer}</div>
        </div>
      )}
    </div>
  );
}
