"use client";

import { useEffect, useRef } from "react";

type Pt = [number, number];

const smooth = (v: number) => {
  const c = Math.min(1, Math.max(0, v));
  return c * c * (3 - 2 * c);
};

/**
 * Lenta shakli (lusion.co videosidagidek) dizayn birliklarida: kenglik 1440, y — bo'lim tepasidan.
 * Formula bilan quriladi — burchaksiz, mukammal silliq:
 *  1) chapdan tekis keladi va yumshoq S bilan pastga tushadi (smoothstep);
 *  2) bitta dumaloq halqa: x = C + k·t − Rx·sin t, y = Yb − Ry·(1 + cos t), t ∈ [−π, π].
 *     Rx > Ry — halqa tomchidek ingichka emas, yumaloq chiqadi;
 *  3) halqadan chiqib, yana yumshoq S bilan o'ng chetga ko'tariladi.
 * Ulanish joylarida yo'nalish gorizontal — chiziq hech qayerda sinmaydi.
 */
const C = 1030; // halqa markazi (x)
const YB = 320; // halqaning pastki nuqtasi (y)
const RX = 150; // halqa eni (yarmi)
const RY = 118; // halqa balandligi (yarmi)
const K = 45; // siljish (K < RX — halqa hosil bo'ladi)
const Y_IN = 40; // kirish chizig'i balandligi
const S_IN = 520; // pastga tushish shu yerdan boshlanadi
const RISE = 130; // chiqishda ko'tarilish
const S_OUT = 389; // chiqish egri chizig'i eni

/** left / right — tekis qismlar ekran chetidan chiqib ketguncha cho'ziladi (dizayn birliklarida) */
function designShape(left: number, right: number): Pt[] {
  const xa = C - K * Math.PI; // halqa boshlanishi
  const xb = C + K * Math.PI; // halqa tugashi
  const xe = xb + S_OUT;
  const pts: Pt[] = [];
  // 1) Kirish: tekis, so'ng yumshoq pastga
  for (let x = Math.min(left, S_IN - 60); x < S_IN; x += 60) pts.push([x, Y_IN]);
  for (let i = 0; i <= 40; i++) {
    const x = S_IN + ((xa - S_IN) * i) / 40;
    pts.push([x, Y_IN + (YB - Y_IN) * smooth((x - S_IN) / (xa - S_IN))]);
  }
  // 2) Halqa: t = −π da pastda, o'ngga qarab; tepada orqaga aylanadi; t = π da yana pastda
  for (let i = 1; i < 80; i++) {
    const t = -Math.PI + (2 * Math.PI * i) / 80;
    pts.push([C + K * t - RX * Math.sin(t), YB - RY * (1 + Math.cos(t))]);
  }
  // 3) Chiqish: o'ngga va yumshoq yuqoriga, keyin tekis
  for (let i = 0; i <= 32; i++) {
    const x = xb + (S_OUT * i) / 32;
    pts.push([x, YB - RISE * smooth((x - xb) / S_OUT)]);
  }
  for (let x = xe + 60; x < right + 60; x += 60) pts.push([x, YB - RISE]);
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

/** Ekran kengligiga qarab: lenta o'lchami (masshtab) va qalinligi */
const scaleFor = (w: number) => (w < 640 ? 0.42 : w < 1024 ? 0.55 : 0.7);
const strokeFor = (w: number) => (w < 640 ? 14 : w < 1024 ? 20 : 26);
/** Chizish: bo'lim tepasi ekranning 92% balandligiga kelganda boshlanadi, 42% ga kelganda tugaydi */
const START = 0.92;
const RANGE = 0.5;
/** Ergashish yumshoqligi (ms) va eng katta tezlik (px/ms) — kadr tezligiga (60/120 Hz) bog'liq emas */
const EASE_MS = 120;
const SPEED = 2.2;

type Line = { svg: SVGSVGElement; el: SVGPathElement; key: string; top: number; total: number; cur: number; target: number };

/**
 * Skroll bilan chiziladigan yo'g'on lenta (referens: lusion.co). Faqat `data-rb-shape` belgisi bor bo'limlarda
 * ("a" — halqa o'ngda, "b" — ko'zgudagidek, chapda), sarlavha ustidagi bo'sh joyda, kontent ortida.
 * Har bir lenta o'zining kichik SVG'sida — skrollda faqat shu kichik qism qayta chiziladi (telefonda qotmaydi).
 * Pastga tushganda chapdan-o'ngga chiziladi, yuqoriga qaytganda o'chadi.
 */
export function ScrollRibbon() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = wrapRef.current;
    const wrap = layer?.parentElement;
    if (!layer || !wrap) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lines: Line[] = [];
    let layerTop = 0;
    let raf = 0;
    let last = 0;

    const targetFor = (l: Line) => {
      const vh = window.innerHeight;
      const y = layerTop + l.top - window.scrollY; // lenta tepasining ekrandagi o'rni
      return Math.min(1, Math.max(0, (vh * START - y) / (vh * RANGE)));
    };

    const tick = (now: number) => {
      const dt = Math.min(64, last ? now - last : 16);
      last = now;
      let moving = false;
      for (const l of lines) {
        const diff = l.target - l.cur;
        if (Math.abs(diff) < 0.0005) l.cur = l.target;
        else {
          const max = (SPEED * dt) / l.total;
          l.cur += Math.max(-max, Math.min(max, diff * (1 - Math.exp(-dt / EASE_MS))));
          moving = true;
        }
        l.el.style.strokeDashoffset = String(1 - l.cur);
      }
      raf = moving ? requestAnimationFrame(tick) : 0;
      if (!raf) last = 0;
    };

    const onScroll = () => {
      for (const l of lines) l.target = targetFor(l);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    /** Bo'limlarning o'rni va sarlavhagacha bo'lgan bo'sh joy (lenta shu joyga sig'diriladi) */
    const measure = () => {
      const base = layer.getBoundingClientRect();
      return [...wrap.querySelectorAll<HTMLElement>("[data-rb-shape]")].map((el) => {
        const r = el.getBoundingClientRect();
        const head = el.querySelector("h2")?.getBoundingClientRect();
        return { top: r.top - base.top, band: head ? head.top - r.top : 200, flip: el.dataset.rbShape === "b" };
      });
    };

    const build = () => {
      const w = layer.clientWidth;
      if (!w) return;
      layerTop = layer.getBoundingClientRect().top + window.scrollY;
      const sw = strokeFor(w);
      const prev = lines;
      const next = measure().map((m, gi) => {
        // Sarlavhaga tegmasin: halqaning pastki cheti sarlavhadan ~10px yuqorida
        const s = Math.max(0.3, Math.min(scaleFor(w), (m.band - sw / 2 - 10) / YB));
        const key = `${w}|${s.toFixed(3)}|${m.flip}`;
        const old = prev[gi];
        if (old && old.key === key) {
          // Faqat o'rni o'zgargan (rasm yuklandi va h.k.) — chiziqni qayta qurmasdan suramiz
          old.top = m.top;
          old.svg.style.top = `${m.top}px`;
          return old;
        }
        const h = Math.ceil(YB * s + sw / 2 + 2);
        const toDesign = (px: number) => 720 + (px - w / 2) / s;
        const pts = designShape(toDesign(-sw * 2), toDesign(w + sw * 2)).map(([x, y]) => {
          const px = w / 2 + (x - 720) * s;
          return [m.flip ? w - px : px, y * s] as Pt;
        });
        // Uzunlik — siniq chiziq bo'yicha (nuqtalar zich, egri chiziqdan farqi sezilmaydi)
        let total = 0;
        for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svg.setAttribute("width", String(w));
        svg.setAttribute("height", String(h));
        svg.setAttribute("fill", "none");
        svg.style.cssText = `position:absolute;left:0;top:${m.top}px;display:block`;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
        el.setAttribute("d", smoothPath(pts));
        el.setAttribute("pathLength", "1");
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("stroke-linejoin", "round");
        el.setAttribute("stroke-width", String(sw));
        el.style.stroke = "var(--ribbon)";
        el.style.strokeDasharray = "1";
        svg.appendChild(el);

        const line: Line = { svg, el, key, top: m.top, total, cur: 0, target: 0 };
        line.target = reduced ? 1 : targetFor(line);
        line.cur = reduced ? 1 : Math.min(old?.cur ?? 0, line.target);
        el.style.strokeDashoffset = String(1 - line.cur);
        return line;
      });
      for (const l of prev) if (!next.includes(l)) l.svg.remove();
      for (const l of next) if (l.svg.parentNode !== layer) layer.appendChild(l.svg);
      lines = next;
      if (!reduced) onScroll();
    };

    build();
    // Balandlik yoki kenglik o'zgarsa (rasm yuklandi, shrift almashdi) — biroz kutib qayta o'lchanadi, har kadrda emas
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
      for (const l of lines) l.svg.remove();
    };
  }, []);

  return <div ref={wrapRef} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" />;
}
