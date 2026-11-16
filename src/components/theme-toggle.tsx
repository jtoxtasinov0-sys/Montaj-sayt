"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback } from "react";

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/** Bitta tugma bilan qorong'i ↔ yorug' mavzu. Doira shaklida ochiladigan animatsiya (View Transitions API). */
export function ThemeToggle({ label }: { label: string }) {
  const toggle = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    const apply = () => {
      root.classList.toggle("dark", next === "dark");
      document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    };
    const doc = document as DocWithVT;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) return apply();
    const x = e.clientX || window.innerWidth - 40;
    const y = e.clientY || 40;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    doc.startViewTransition(apply).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="relative grid h-10 w-10 place-items-center rounded-full border border-line text-fg transition hover:border-primary-2 hover:bg-primary/10"
    >
      <Sun className="h-[18px] w-[18px] scale-0 rotate-90 transition duration-500 dark:scale-100 dark:rotate-0" />
      <Moon className="absolute h-[18px] w-[18px] scale-100 rotate-0 transition duration-500 dark:scale-0 dark:-rotate-90" />
    </button>
  );
}
