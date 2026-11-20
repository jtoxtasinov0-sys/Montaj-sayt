"use client";

import { useEffect, useRef } from "react";

type Pt = [number, number];

/**
 * Halqa nuqtalari (rx, ry birliklarida). "ccw" — o'ngdan kirib, pastdan chapga, chap tomondan yuqoriga,
 * tepadan o'ngga aylanadi va o'ng tomondan pastga tushib, kirish chizig'ini kesib o'tadi (lusion.co dagidek halqa).
 * "cw" — xuddi shu, ko'zgudagidek (chapdan kiradi).
 */
const LOOP: Pt[] = [
  [1.9, 0.95],
  [0.2, 1.0],
  [-0.95, 0.2],
  [-0.45, -0.9],
  [0.5, -0.85],
  [0.98, 0.05],
  [0.45, 1.55],
];

/**
 * Lenta yo'li sahifadagi belgilangan elementlarga bog'lanadi (ekran o'lchami o'zgarsa ham halqa o'z sarlavhasi atrofida qoladi):
 *  - `data-rb="via"` — bitta nuqta: x = data-rb-x × kenglik, y = element tepasi + data-rb-y × element balandligi;
 *  - `data-rb="loop"` — shu nuqta atrofida halqa (data-rb-dir: ccw | cw, data-rb-r: radius ko'paytiruvchisi).
 */
function anchorPoints(wrap: HTMLElement, w: number): Pt[] {
  const base = wrap.getBoundingClientRect();
  const r0 = w < 640 ? w * 0.24 : Math.min(190, Math.max(110, w * 0.11));
  const pts: Pt[] = [];
  wrap.querySelectorAll<HTMLElement>("[data-rb]").forEach((el) => {
    const r = el.getBoundingClientRect();
    const x = parseFloat(el.dataset.rbX ?? "0.5") * w;
    const y = r.top - base.top + parseFloat(el.dataset.rbY ?? "0.5") * r.height;
    if (el.dataset.rb === "loop") {
      const rx = r0 * parseFloat(el.dataset.rbR ?? "1");
      const ry = rx * 1.05;
      const s = el.dataset.rbDir === "cw" ? -1 : 1;
      for (const [ox, oy] of LOOP) pts.push([x + s * ox * rx, y + oy * ry]);
    } else {
      pts.push([x, y]);
    }
  });
  return pts;
}

/**
 * Centripetal Catmull-Rom → kubik Bezier: nuqtalar orqali silliq egri chiziq.
 * Oddiy Catmull-Rom nuqtalar notekis joylashganda o'tkir uch (qirra) hosil qiladi; centripetal (α = 0.5)
 * variant esa uchsiz, yumshoq burilish beradi va segment ichida o'zini kesib o'tmaydi.
 */
function smoothPath(pts: Pt[]) {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    // d = |Δ|^α, α = 0.5  →  d² = |Δ|
    const d1 = Math.sqrt(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
    const d2 = Math.sqrt(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]));
    const d3 = Math.sqrt(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]));
    const c1: Pt =
      d1 < 1e-6
        ? p1
        : ([0, 1].map((k) => (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) / (3 * d1 * (d1 + d2))) as Pt);
    const c2: Pt =
      d3 < 1e-6
        ? p2
        : ([0, 1].map((k) => (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) / (3 * d3 * (d3 + d2))) as Pt);
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

const SAMPLES = 1600;
/** Lenta uchi ekranning shu qismigacha chizilgan bo'ladi */
const TIP = 0.72;
/** Chizish tezligi chegarasi (lenta uzunligi, px/kadr) — halqalar qalam bilan chizilgandek bir tekis chiziladi */
const SPEED = 38;

/**
 * Skroll bilan chiziladigan yo'g'on lenta (referens: lusion.co). Bosh sahifa kontenti ortida turadi:
 * kartalar ustidan yopadi, bo'sh joylarda ko'rinadi, bo'lim sarlavhalari atrofida halqa yasaydi.
 * Uchi doim ko'rinish oynasining ~72% balandligida — pastga tushganda chiziladi, yuqoriga qaytganda o'chadi.
 */
export function ScrollRibbon() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const layer = wrapRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    const wrap = layer?.parentElement;
    if (!layer || !svg || !path || !wrap) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // reachY[i] — lenta boshidan i/SAMPLES qismigacha chizilganda erishilgan eng pastki nuqta (px)
    let reachY = new Float32Array(SAMPLES + 1);
    let total = 1;
    let top = 0;
    let cur = 0;
    let target = 0;
    let raf = 0;

    const draw = (v: number) => {
      path.style.strokeDashoffset = String(1 - v);
    };

    const targetFor = () => {
      const y = window.scrollY + window.innerHeight * TIP - top;
      let lo = 0;
      let hi = SAMPLES;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (reachY[mid] >= y) hi = mid;
        else lo = mid + 1;
      }
      return lo / SAMPLES;
    };

    const tick = () => {
      const diff = target - cur;
      const max = SPEED / total;
      const step = Math.max(-max, Math.min(max, diff * 0.16));
      cur = Math.abs(diff) < 0.0003 ? target : cur + step;
      draw(cur);
      raf = cur === target ? 0 : requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = targetFor();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const build = () => {
      const w = layer.clientWidth;
      const h = layer.clientHeight;
      if (!w || !h) return;
      const pts = anchorPoints(wrap, w);
      if (pts.length < 2) return;
      top = layer.getBoundingClientRect().top + window.scrollY;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      path.setAttribute("d", smoothPath(pts));
      path.setAttribute("stroke-width", String(w < 640 ? 16 : w < 1024 ? 24 : 34));
      total = path.getTotalLength();
      const next = new Float32Array(SAMPLES + 1);
      let max = -Infinity;
      for (let i = 0; i <= SAMPLES; i++) {
        max = Math.max(max, path.getPointAtLength((total * i) / SAMPLES).y);
        next[i] = max;
      }
      reachY = next;
      if (reduced) {
        cur = target = 1;
        draw(1);
        return;
      }
      target = targetFor();
      cur = Math.min(cur, target);
      draw(cur);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    build();
    // Balandlik o'zgarsa (rasm yuklandi, taxlanadigan kartalar ochildi) — biroz kutib qayta quriladi, har kadrda emas
    let rebuild: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(rebuild);
      rebuild = setTimeout(build, 140);
    });
    ro.observe(layer);
    if (!reduced) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }
    return () => {
      clearTimeout(rebuild);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <svg ref={svgRef} className="block h-full w-full" fill="none">
        <path
          ref={pathRef}
          pathLength={1}
          stroke="var(--ribbon-a)"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
        />
      </svg>
    </div>
  );
}
