"use client";

import { useEffect, useRef, useState } from "react";

/** Butun sahifa uchun bitta pointermove tinglovchisi: [data-spotlight] kartalarda yorug'lik */
export function SpotlightTracker() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let raf = 0;
    const on = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-spotlight]") as HTMLElement | null;
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", on, { passive: true });
    return () => document.removeEventListener("pointermove", on);
  }, []);
  return null;
}

const REVEAL = "[data-reveal],[data-split]";
const SCOPE = "[data-anim]";

/**
 * Butun sayt uchun bitta kuzatuvchi:
 * 1) [data-reveal] / [data-split] — ko'rinishga kirganda `data-in` qo'yadi (CSS animatsiyani boshlaydi);
 * 2) [data-anim] — ekrandan uzoqda bo'lsa `data-paused` (cheksiz animatsiyalar to'xtaydi, batareya tejaladi).
 * Gidratatsiyadan oldin hamma narsa ko'rinib turadi: yashirish faqat <html data-io> qo'yilgach ishlaydi,
 * o'sha lahzada ekranda turganlar esa animatsiyasiz darhol ochiladi — miltillash yo'q.
 */
export function MotionRoot() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const html = document.documentElement;

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          reveal.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scope = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.toggleAttribute("data-paused", !e.isIntersecting);
      },
      { rootMargin: "240px 0px" },
    );

    const collect = (root: ParentNode, initial: boolean) => {
      const vh = window.innerHeight;
      const els: Element[] = [];
      if (root instanceof Element && root.matches(REVEAL)) els.push(root);
      root.querySelectorAll(REVEAL).forEach((el) => els.push(el));
      for (const el of els) {
        if (el.hasAttribute("data-in")) continue;
        if (initial) {
          const r = el.getBoundingClientRect();
          if (r.top < vh && r.bottom > 0) {
            el.setAttribute("data-in", "now");
            continue;
          }
        }
        reveal.observe(el);
      }
      if (root instanceof Element && root.matches(SCOPE)) scope.observe(root);
      root.querySelectorAll(SCOPE).forEach((el) => scope.observe(el));
    };

    collect(document, true);
    html.setAttribute("data-io", "");

    // Sahifalar orasida o'tilganda yangi elementlar ham kuzatiladi
    const forget = (n: Element) => {
      for (const el of [n, ...n.querySelectorAll(`${REVEAL},${SCOPE}`)]) {
        reveal.unobserve(el);
        scope.unobserve(el);
      }
    };
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.removedNodes.forEach((n) => n instanceof Element && forget(n));
        m.addedNodes.forEach((n) => n instanceof Element && collect(n, false));
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      reveal.disconnect();
      scope.disconnect();
      html.removeAttribute("data-io");
    };
  }, []);
  return null;
}

/** Ko'rinishga kirganda raqamni 0 dan sanab chiqish */
export function CountUp({ to, decimals = 0, suffix = "", duration = 1600 }: { to: number; decimals?: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setVal(0);
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          setVal(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}
