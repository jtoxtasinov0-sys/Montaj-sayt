"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

/**
 * overDark: sahifa tepasida qorong'i hero bo'lsa — skroll qilinmaguncha header qorong'i uslubda.
 * Bosh sahifa hero'si mavzuga moslashadi — u yerda header ham mavzuni kuzatadi.
 */
export function HeaderShell({ children, overDark = true }: { children: React.ReactNode; overDark?: boolean }) {
  const path = usePathname();
  const forceDark = overDark && path !== "/";
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={cn(
        "hdr-in fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "glass border-x-0 border-t-0 py-2" : "border-b border-transparent py-4",
        !scrolled && forceDark && "dark text-fg",
      )}
    >
      {children}
    </header>
  );
}

export function NavPills({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 rounded-full border border-line bg-card/40 p-1 backdrop-blur-md lg:flex">
      {items.map((it, i) => {
        const active = it.href !== "/" && path.startsWith(it.href.split("#")[0]) && !it.href.includes("#");
        return (
          <Link
            key={it.href}
            href={it.href}
            style={{ "--n": i } as React.CSSProperties}
            className={cn(
              "rounded-full px-4 py-1.5 text-[0.84rem] transition",
              active ? "bg-fg text-bg" : "text-muted hover:bg-card-2 hover:text-fg",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileMenu({ items, footer, label }: { items: NavItem[]; footer: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
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
        <div className="fixed inset-x-0 top-[64px] bottom-0 z-40 overflow-y-auto bg-bg/95 px-4 pt-6 pb-10 backdrop-blur-xl fade-up">
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
