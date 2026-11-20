"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { GlyphIcon } from "@/components/motion";

export type StackItem = { key: string; icon: string; title: string; text: string; href: string; cta: string };

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Taxlanadigan kartalar (referens: cuberto.com xizmatlar bo'limi). Har bir karta sticky:
 *  - pastdan kelayotganda och kulrang, faqat sarlavha — o'z joyiga yetganda to'q fon, rangli nur va matn ochiladi (--a);
 *  - ustiga keyingi karta chiqqanda biroz kichrayadi va qorayadi (--c).
 * Qiymatlar skroll bilan rAF'da hisoblanadi; harakat kamaytirilgan rejimda hammasi ochiq, animatsiyasiz.
 */
export function CategoriesStack({ items }: { items: StackItem[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cards = [...el.querySelectorAll<HTMLElement>("[data-stack]")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cards.forEach((c) => c.classList.add("is-on"));
      return;
    }
    let tops: number[] = [];
    let raf = 0;
    const measure = () => {
      tops = cards.map((c) => parseFloat(getComputedStyle(c.parentElement!).top) || 0);
    };
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const rects = cards.map((c) => c.getBoundingClientRect());
      cards.forEach((card, i) => {
        const r = rects[i];
        const a = clamp(1 - (r.top - tops[i]) / (vh * 0.45));
        const next = rects[i + 1];
        const c = next ? clamp(1 - (next.top - tops[i + 1]) / Math.max(1, r.height)) : 0;
        card.style.setProperty("--a", a.toFixed(3));
        card.style.setProperty("--c", c.toFixed(3));
        card.classList.toggle("is-on", a > 0.5);
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={root} className="[--stack-top:5rem] sm:[--stack-top:6.5rem]">
      {items.map((it, i) => (
        <div key={it.key} className="stack-item" style={{ "--i": i } as React.CSSProperties}>
          <article data-stack className="stack-card glyph-host">
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto] md:gap-12">
              <div>
                <div className="flex items-start justify-between gap-6">
                  <h3 className="text-2xl leading-tight font-normal tracking-tight sm:text-[2rem]">{it.title}</h3>
                  <span className="font-mono text-sm opacity-60">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="stack-body">
                  <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed opacity-80">{it.text}</p>
                  <Link href={it.href} className="group mt-6 inline-flex items-center gap-3 text-sm">
                    {it.cta}
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-black transition-transform duration-300 group-hover:rotate-45">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </Link>
                </div>
              </div>
              <GlyphIcon name={it.icon} className="stack-body hidden h-36 w-36 opacity-90 md:block lg:h-44 lg:w-44" />
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}
