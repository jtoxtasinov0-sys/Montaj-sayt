"use client";

import { useEffect, useRef } from "react";

type Pt = [number, number];

/**
 * Lenta shakli (lusion.co videosidagidek), 1440 × 900 dizayn maydonida: chap chetdan kirib, katta yoy bilan pastga
 * tushadi, chap tomonda bitta yumshoq halqa yasaydi (o'z chizig'ini kesib o'tadi) va uzun S-to'lqin bilan o'ng chetdan chiqadi.
 * Nuqtalar bir-biridan teng uzoqlikda — burilishlar burchaksiz, silliq chiqadi.
 */
const SHAPE: Pt[] = [
  [-90, 30],
  [250, 130],
  [450, 330],
  [440, 560],
  [320, 720],
  [160, 700],
  [120, 560],
  [240, 470],
  [440, 510],
  [680, 640],
  [930, 800],
  [1200, 860],
  [1540, 800],
];

/**
 * Lenta faqat `data-rb-shape` belgisi bor bo'limlarda chiziladi ("a" — oddiy, "b" — ko'zgudagidek).
 * Har bir bo'lim uchun alohida chiziq: shakl bo'lim tepasidan boshlanadi, kenglikka moslab masshtablanadi.
 */
function shapeGroups(wrap: HTMLElement, w: number): Pt[][] {
  const base = wrap.getBoundingClientRect();
  const u = Math.max(w / 1440, 0.42);
  return [...wrap.querySelectorAll<HTMLElement>("[data-rb-shape]")].map((el) => {
    const top = el.getBoundingClientRect().top - base.top;
    const flip = el.dataset.rbShape === "b";
    return SHAPE.map(([x, y]) => {
      const px = w / 2 + (x - 720) * u;
      return [flip ? w - px : px, top + y * u] as Pt;
    });
  });
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

const SAMPLES = 900;
/** Lenta uchi ekranning shu qismigacha chizilgan bo'ladi */
const TIP = 0.72;
/** Chizish tezligi chegarasi (lenta uzunligi, px/kadr) — halqalar qalam bilan chizilgandek bir tekis chiziladi */
const SPEED = 38;

/**
 * Skroll bilan chiziladigan yo'g'on lenta (referens: lusion.co). Faqat 2–3 ta belgilangan bo'limda, kontent ortida:
 * kartalar ustidan yopadi, bo'sh joylarda ko'rinadi.
 * Uchi doim ko'rinish oynasining ~72% balandligida — pastga tushganda chiziladi, yuqoriga qaytganda o'chadi.
 */
export function ScrollRibbon() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const layer = wrapRef.current;
    const svg = svgRef.current;
    const wrap = layer?.parentElement;
    if (!layer || !svg || !wrap) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Har bir chiziq: reachY[i] — boshidan i/SAMPLES qismigacha chizilganda erishilgan eng pastki nuqta (px)
    type Line = { el: SVGPathElement; reachY: Float32Array; total: number; cur: number; target: number };
    let lines: Line[] = [];
    let top = 0;
    let raf = 0;

    const targetFor = (l: Line) => {
      const y = window.scrollY + window.innerHeight * TIP - top;
      let lo = 0;
      let hi = SAMPLES;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (l.reachY[mid] >= y) hi = mid;
        else lo = mid + 1;
      }
      return lo / SAMPLES;
    };

    const tick = () => {
      let moving = false;
      for (const l of lines) {
        const diff = l.target - l.cur;
        const max = SPEED / l.total;
        l.cur = Math.abs(diff) < 0.0003 ? l.target : l.cur + Math.max(-max, Math.min(max, diff * 0.16));
        l.el.style.strokeDashoffset = String(1 - l.cur);
        if (l.cur !== l.target) moving = true;
      }
      raf = moving ? requestAnimationFrame(tick) : 0;
    };

    const onScroll = () => {
      for (const l of lines) l.target = targetFor(l);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const build = () => {
      const w = layer.clientWidth;
      const h = layer.clientHeight;
      if (!w || !h) return;
      top = layer.getBoundingClientRect().top + window.scrollY;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const groups = shapeGroups(wrap, w);
      const prev = lines;
      svg.replaceChildren();
      lines = groups.map((pts, gi) => {
        const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
        el.setAttribute("d", smoothPath(pts));
        el.setAttribute("pathLength", "1");
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", "var(--ribbon-a)");
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("stroke-linejoin", "round");
        el.setAttribute("stroke-width", String(w < 640 ? 16 : w < 1024 ? 24 : 34));
        el.style.strokeDasharray = "1";
        svg.appendChild(el);
        const total = el.getTotalLength();
        const reachY = new Float32Array(SAMPLES + 1);
        let max = -Infinity;
        for (let i = 0; i <= SAMPLES; i++) {
          max = Math.max(max, el.getPointAtLength((total * i) / SAMPLES).y);
          reachY[i] = max;
        }
        const line: Line = { el, reachY, total, cur: 0, target: 0 };
        line.target = reduced ? 1 : targetFor(line);
        line.cur = reduced ? 1 : Math.min(prev[gi]?.cur ?? 0, line.target);
        el.style.strokeDashoffset = String(1 - line.cur);
        return line;
      });
      if (!reduced && !raf) raf = requestAnimationFrame(tick);
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
      <svg ref={svgRef} className="block h-full w-full" fill="none" />
    </div>
  );
}
