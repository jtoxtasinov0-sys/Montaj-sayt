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
/** Yumshoq yorug'lik dog'lari orasidagi masofa (px) */
const BLOOM_GAP = 40;

/**
 * Neonni ota elementning haqiqiy o'lchami va radiusiga moslaydi.
 * Ikkala qism bir xil yo'l, bir xil davomiylik (perimetr / tezlik) bilan yuradi — har qanday kartada
 * va burchakda tezlik bir xil, ikki nur esa aynan bir xil (chiziq naqshi davri — perimetrning yarmi).
 * offsetWidth — transform (3D paydo bo'lish) ta'sir qilmaydigan o'lcham.
 */
function layoutNeon(el: HTMLElement) {
  const svg = el.querySelector("svg");
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
  // Yo'l chegaraning o'rtasidan o'tadi: tashqi variantda 1px chegara markazi, ichkida — ichkariroq
  const i = inside ? 1.25 : 0.5;
  const W = w - 2 * i;
  const H = h - 2 * i;
  const r = Math.max(0, Math.min(radius - i, W / 2, H / 2));
  const f = (n: number) => n.toFixed(2);
  const [x0, y0, x1, y1] = [i, i, i + W, i + H];
  // SVG <rect> bilan bir xil boshlanish nuqtasi va yo'nalish (yuqori chap burchakdan keyin, soat bo'yicha)
  const d =
    `M${f(x0 + r)} ${f(y0)}H${f(x1 - r)}` +
    (r ? `A${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(y0 + r)}` : "") +
    `V${f(y1 - r)}` +
    (r ? `A${f(r)} ${f(r)} 0 0 1 ${f(x1 - r)} ${f(y1)}` : "") +
    `H${f(x0 + r)}` +
    (r ? `A${f(r)} ${f(r)} 0 0 1 ${f(x0)} ${f(y1 - r)}` : "") +
    `V${f(y0 + r)}` +
    (r ? `A${f(r)} ${f(r)} 0 0 1 ${f(x0 + r)} ${f(y0)}` : "") +
    "Z";
  const per = 2 * (W + H) - 8 * r + 2 * Math.PI * r;
  const half = per / 2;
  const seg = parent.classList.contains("btn") ? half * 0.62 : Math.min(250, Math.max(100, per * 0.2), half * 0.8);
  // Chiziq markazi o'rta (k1) yorug'lik dog'i bilan bir nuqtada — u boshlanishdan BLOOM_GAP oldinda
  for (const rect of svg.children) {
    const L = seg * (Number(rect.getAttribute("data-f")) || 1);
    rect.setAttribute("x", f(x0));
    rect.setAttribute("y", f(y0));
    rect.setAttribute("width", f(W));
    rect.setAttribute("height", f(H));
    rect.setAttribute("rx", f(r));
    rect.setAttribute("ry", f(r));
    rect.setAttribute("stroke-dasharray", `${f(L)} ${f(half - L)}`);
    const o0 = L / 2 - BLOOM_GAP;
    rect.setAttribute("stroke-dashoffset", f(o0));
    (rect as SVGElement).style.setProperty("--o0", `${f(o0)}px`);
    (rect as SVGElement).style.setProperty("--o1", `${f(o0 - per)}px`);
  }
  el.style.setProperty("--path", `path("${d}")`);
  el.style.setProperty("--dur", `${(per / NEON_SPEED).toFixed(3)}s`);
  el.style.setProperty("--sp", `${(BLOOM_GAP / NEON_SPEED).toFixed(4)}s`);
  el.style.setProperty("--bs", `${f(Math.min(150, Math.max(56, Math.min(w, h) * 0.7)))}px`);
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
