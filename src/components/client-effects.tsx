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
const NEON = ".neon";
/** Neon nur tezligi — barcha ramkalarda bir xil, px/soniya */
const NEON_SPEED = 140;

/**
 * Neon ramkani ota elementning haqiqiy o'lchami va radiusiga moslaydi.
 * Uzunlik (perimetr) ma'lum bo'lgach nur chiziq bo'ylab o'zgarmas tezlikda yuradi.
 * offsetWidth — transform (3D paydo bo'lish) ta'sir qilmaydigan o'lcham.
 */
function layoutNeon(el: HTMLElement) {
  const svg = el.firstElementChild;
  const parent = el.parentElement;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (!svg || !parent || !w || !h) return;
  const cs = getComputedStyle(parent);
  const raw = cs.borderTopLeftRadius;
  let radius = parseFloat(raw) || 0;
  if (raw.endsWith("%")) radius = (radius / 100) * Math.min(w, h);
  const inside = el.classList.contains("neon-inside");
  if (inside) radius = Math.max(0, radius - (parseFloat(cs.borderTopWidth) || 0));
  // Chiziq markazi: tashqi variantda — 1px chegaraning o'rtasida, ichkida — to'liq ichkarida
  const i = inside ? 1 : 0.5;
  const W = w - 2 * i;
  const H = h - 2 * i;
  const r = Math.max(0, Math.min(radius - i, W / 2, H / 2));
  const per = 2 * (W + H) - 8 * r + 2 * Math.PI * r;
  const period = el.classList.contains("neon-twin") ? per / 2 : per;
  for (const rect of svg.children) {
    const L = Math.min(Number(rect.getAttribute("data-l")) || 40, period * 0.45);
    rect.setAttribute("x", String(i));
    rect.setAttribute("y", String(i));
    rect.setAttribute("width", W.toFixed(2));
    rect.setAttribute("height", H.toFixed(2));
    rect.setAttribute("rx", r.toFixed(2));
    rect.setAttribute("ry", r.toFixed(2));
    rect.setAttribute("stroke-dasharray", `${L.toFixed(2)} ${(period - L).toFixed(2)}`);
    // Boshlar bir nuqtada: har bir qatlam o'z uzunligicha orqaga suriladi
    rect.setAttribute("stroke-dashoffset", L.toFixed(2));
    (rect as SVGElement).style.setProperty("--o0", `${L.toFixed(2)}px`);
    (rect as SVGElement).style.setProperty("--o1", `${(L - per).toFixed(2)}px`);
  }
  el.style.setProperty("--dur", `${(per / NEON_SPEED).toFixed(2)}s`);
  el.setAttribute("data-ready", "");
}

/**
 * Butun sayt uchun bitta kuzatuvchi:
 * 1) [data-reveal] / [data-split] — ko'rinishga kirganda `data-in` qo'yadi (CSS animatsiyani boshlaydi);
 * 2) [data-anim] — ekrandan uzoqda bo'lsa `data-paused` (cheksiz animatsiyalar to'xtaydi, batareya tejaladi);
 * 3) .neon — ramka o'lchamini kuzatib, nurni moslaydi.
 * Gidratatsiyadan oldin hamma narsa ko'rinib turadi: yashirish faqat <html data-io> qo'yilgach ishlaydi,
 * o'sha lahzada ekranda turganlar esa animatsiyasiz darhol ochiladi — miltillash yo'q.
 */
export function MotionRoot() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;

    const neon = new ResizeObserver((entries) => {
      for (const e of entries) layoutNeon(e.target as HTMLElement);
    });
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

    const all = (root: ParentNode, sel: string) => {
      const out: Element[] = root instanceof Element && root.matches(sel) ? [root] : [];
      root.querySelectorAll(sel).forEach((el) => out.push(el));
      return out;
    };

    const collect = (root: ParentNode, initial: boolean) => {
      for (const el of all(root, NEON)) neon.observe(el);
      if (reduced) return;
      const vh = window.innerHeight;
      for (const el of all(root, REVEAL)) {
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
      for (const el of all(root, SCOPE)) scope.observe(el);
    };

    collect(document, true);
    if (!reduced) html.setAttribute("data-io", "");

    // Sahifalar orasida o'tilganda yangi elementlar ham kuzatiladi
    const forget = (n: Element) => {
      for (const el of all(n, `${REVEAL},${SCOPE},${NEON}`)) {
        reveal.unobserve(el);
        scope.unobserve(el);
        neon.unobserve(el);
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
      neon.disconnect();
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
