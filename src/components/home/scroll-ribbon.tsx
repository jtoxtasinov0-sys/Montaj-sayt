"use client";

import { useEffect, useRef } from "react";

type Pt = [number, number];

/**
 * Lenta yo'li: x — kenglik ulushi, y — balandlik ulushi (0…1). Chetdan tashqariga (x < 0 yoki > 1) chiqishi mumkin.
 * Yuqoriga qaytadigan nuqtalar halqa hosil qiladi (lusion.co uslubi).
 */
const PATH: Pt[] = [
  [-0.08, 0.1],
  [0.22, 0.118],
  [0.56, 0.108],
  [0.9, 0.145],
  [1.06, 0.2],
  [0.78, 0.262],
  [0.36, 0.3],
  [0.07, 0.36],
  [0.05, 0.43],
  [0.3, 0.47],
  [0.62, 0.468],
  [0.86, 0.5],
  [0.9, 0.545],
  [0.78, 0.56],
  [0.7, 0.535],
  [0.8, 0.51],
  [0.95, 0.53],
  [1.04, 0.6],
  [0.72, 0.66],
  [0.3, 0.7],
  [-0.04, 0.76],
  [0.12, 0.82],
  [0.55, 0.85],
  [0.92, 0.9],
  [0.66, 0.95],
  [0.38, 0.985],
  [0.6, 1.02],
];

/** Catmull-Rom → kubik Bezier: nuqtalar orqali silliq egri chiziq */
function smoothPath(pts: Pt[]) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

const SAMPLES = 900;
/** Lenta uchi ekranning shu qismigacha chizilgan bo'ladi */
const TIP = 0.72;

/**
 * Skroll bilan chiziladigan yo'g'on lenta (referens: lusion.co). Bosh sahifa kontenti ortida turadi:
 * kartalar ustidan yopadi, bo'sh joylarda ko'rinadi. Uchi doim ko'rinish oynasining ~72% balandligida —
 * pastga tushganda chiziladi, yuqoriga qaytganda o'chadi. Harakat silliq (lerp), faqat kerak bo'lganda rAF ishlaydi.
 */
export function ScrollRibbon() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!wrap || !svg || !path) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // reachY[i] — lenta boshidan i/SAMPLES qismigacha chizilganda erishilgan eng pastki nuqta (px)
    let reachY = new Float32Array(SAMPLES + 1);
    let top = 0;
    let cur = 0;
    let target = 0;
    let raf = 0;

    const draw = (v: number) => {
      path.style.strokeDashoffset = String(1 - v);
    };

    const targetFor = () => {
      const y = window.scrollY + window.innerHeight * TIP - top;
      // birinchi i: reachY[i] >= y (reachY o'smaydigan emas — ikkilik qidiruv)
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
      cur += (target - cur) * 0.12;
      if (Math.abs(target - cur) < 0.0004) cur = target;
      draw(cur);
      raf = cur === target ? 0 : requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = targetFor();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const build = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      top = wrap.getBoundingClientRect().top + window.scrollY;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      path.setAttribute("d", smoothPath(PATH.map(([x, y]) => [x * w, y * h])));
      path.setAttribute("stroke-width", String(w < 640 ? 16 : w < 1024 ? 24 : 34));
      const total = path.getTotalLength();
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
    const ro = new ResizeObserver(() => build());
    ro.observe(wrap);
    if (!reduced) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }
    return () => {
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
          stroke="var(--ribbon)"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
        />
      </svg>
    </div>
  );
}
