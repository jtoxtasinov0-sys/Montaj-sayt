"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [top, setTop] = useState(72);
  const btn = useRef<HTMLButtonElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useScrollLock(open);

  // Layout effekt: o'lcham birinchi chizishdan oldin olinadi — panel joyidan "sakramaydi"
  useLayoutEffect(() => {
    if (!open) return;
    // Panel header ostidan boshlansin: header balandligi skrollga qarab o'zgaradi (py-4 ↔ py-2) — haqiqiy o'lchamni olamiz
    const header = btn.current?.closest("header");
    const measure = () => header && setTop(Math.round(header.getBoundingClientRect().bottom));
    measure();
    const ro = header ? new ResizeObserver(measure) : null;
    if (header) ro?.observe(header);
    // Planshet burilib keng ekranga o'tsa — menyu yashirinadi, sahifa qulfda qolib ketmasin
    const wide = window.matchMedia("(min-width: 64rem)");
    const onWide = () => wide.matches && setOpen(false);
    onWide();
    wide.addEventListener("change", onWide);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      ro?.disconnect();
      wide.removeEventListener("change", onWide);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-full border border-line"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open &&
        // Panel body'ga chiqariladi: skroll qilinganda header'da backdrop-filter (glass) bo'ladi, u esa ichidagi
        // "position: fixed" ni header'ning o'ziga qamab qo'yadi — telefonda menyu kesilib, sahifa ustida chiqib qolardi
        createPortal(
          <div
            id="mobile-menu"
            className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-bg px-4 pb-10 lg:hidden"
            style={{ paddingTop: top + 24, animation: "rv-fade 0.3s var(--ease-out) both" }}
          >
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
            <div className="mt-8 flex flex-col gap-4 fade-up" style={{ animationDelay: `${items.length * 60}ms` }}>
              {footer}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
