"use client";

import { useEffect, useRef } from "react";

type Pt = [number, number];

/**
 * Lenta shakli (lusion.co videosidagidek), piksellarda, bo'lim tepasidan:
 *  1) ekranning bir chetidan (ekran tashqarisidan) yuqoridan kirib, uzun egri bilan pastga suzib tushadi;
 *  2) bitta katta dumaloq halqa yasaydi: x = C + k·t − Rx·sin t, y = Yb − Ry·(1 + cos t), t ∈ [−π, π]
 *     (cho'zilgan sikloida — burchaksiz, mukammal yumaloq; Rx > k bo'lgani uchun halqa hosil bo'ladi);
 *  3) halqadan chiqib, pastga egilib narigi chetdan ekran tashqarisiga "yon tomonga" ketadi.
 * Kirish va chiqish — Hermite egri chiziqlari; halqa bilan ulanish joyida yo'nalish bir xil (gorizontal),
 * shuning uchun chiziq hech qayerda sinmaydi.
 */
const RX = 300; // halqa eni (yarmi), dizayn birligida — RY dan katta, shunda halqa tomchidek emas, yumaloq
const RY = 185; // halqa balandligi (yarmi)
const K = 80; // siljish (K < RX — halqa hosil bo'ladi)

function hermite(p0: Pt, m0: Pt, p1: Pt, m1: Pt, n: number, out: Pt[]) {
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    out.push([
      h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0],
      h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1],
    ]);
  }
}

const dir = (x: number, y: number, len: number): Pt => {
  const l = Math.hypot(x, y);
  return [(x / l) * len, (y / l) * len];
};

type Geo = { w: number; f: number; cx: number; yb: number; sw: number };

/** Lenta nuqtalari (chapdan o'ngga; "b" bo'lsa keyin ko'zgudagidek aylantiriladi) */
function ribbonPoints({ w, f, cx, yb, sw }: Geo): Pt[] {
  const rx = RX * f;
  const ry = RY * f;
  const k = K * f;
  const xa = cx - k * Math.PI; // halqa boshlanishi (pastda, o'ngga qarab)
  const xb = cx + k * Math.PI; // halqa tugashi
  const pts: Pt[] = [];

  // 1) Kirish: chap chetdan tashqaridan, halqa tepasi balandligidan — pastga, halqa boshiga
  const p0: Pt = [-sw * 1.5, yb - 2 * ry * 0.9];
  const p1: Pt = [xa, yb];
  const dIn = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  pts.push(p0);
  hermite(p0, dir(1, 0.3, dIn), p1, [dIn, 0], 48, pts);

  // 2) Halqa: t = −π da pastda, o'ngga qarab; tepada orqaga aylanadi; t = π da yana pastda
  for (let i = 1; i < 96; i++) {
    const t = -Math.PI + (2 * Math.PI * i) / 96;
    pts.push([cx + k * t - rx * Math.sin(t), yb - ry * (1 + Math.cos(t))]);
  }

  // 3) Chiqish: o'ngga va pastga egilib, o'ng chetdan tashqariga (joy qancha bo'lsa, shuncha pastga — burilish keskin emas)
  const p2: Pt = [xb, yb];
  const room = w + sw * 1.5 - xb;
  const p3: Pt = [w + sw * 1.5, yb + Math.min(ry * 0.9, room * 0.75)];
  const dOut = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
  pts.push(p2);
  hermite(p2, [dOut * 0.8, 0], p3, dir(1, 0.6, dOut * 0.8), 40, pts);
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

/** Ekran kengligiga qarab: lenta o'lchami (1 dizayn birligi = shuncha px) va qalinligi */
const unitFor = (w: number) => (w < 640 ? (w * 1.3) / 1000 : Math.min(1100, w) / 1000);
const strokeFor = (w: number) => (w < 640 ? 16 : w < 1024 ? 22 : 28);
/**
 * Chizish skrollga bog'langan (lusion.co'dagidek): lenta tepasi ekranning 92% balandligiga kelganda boshlanadi,
 * lenta pastki cheti ekranning 62% balandligiga kelganda to'liq chizilgan bo'ladi. Yuqoriga qaytganda o'chadi.
 */
const START = 0.92;
const END = 0.62;
/** Ergashish yumshoqligi (ms) va eng katta tezlik (px/ms) — kadr tezligiga (60/120 Hz) bog'liq emas */
const EASE_MS = 120;
const SPEED = 2.6;

type Line = { svg: SVGSVGElement; el: SVGPathElement; key: string; top: number; h: number; total: number; cur: number; target: number };

/**
 * Skroll bilan chiziladigan yo'g'on kulrang lenta (referens: lusion.co). Faqat `data-rb-shape` belgisi bor bo'limlarda:
 * "a" — chapdan kirib o'ngdan chiqadi, "b" — ko'zgudagidek (o'ngdan kirib chapdan chiqadi).
 * Lenta katta: sarlavha ortidan o'tadi, kartalar ortiga yashirinadi, ekran chetlaridan tashqariga chiqib ketadi.
 * Har bir lenta o'zining SVG'sida — skrollda faqat shu qism qayta chiziladi (telefonda qotmaydi).
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
      return Math.min(1, Math.max(0, (vh * START - y) / (vh * (START - END) + l.h)));
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

    /** Bo'limlarning o'rni va sarlavhaning bo'lim ichidagi o'rni (halqa sarlavha ortidan o'tadi) */
    const measure = () => {
      const base = layer.getBoundingClientRect();
      return [...wrap.querySelectorAll<HTMLElement>("[data-rb-shape]")].map((el) => {
        const r = el.getBoundingClientRect();
        const head = el.querySelector("h2")?.getBoundingClientRect();
        return {
          top: r.top - base.top,
          headTop: head ? head.top - r.top : 200,
          headH: head ? head.height : 80,
          flip: el.dataset.rbShape === "b",
        };
      });
    };

    const build = () => {
      const w = layer.clientWidth;
      if (!w) return;
      layerTop = layer.getBoundingClientRect().top + window.scrollY;
      const sw = strokeFor(w);
      const u = unitFor(w);
      const prev = lines;
      const next = measure().map((m, gi) => {
        // Halqaning pastki nuqtasi — sarlavha o'rtasidan sal pastda; halqa tepasi bo'lim tepasidan chiqib ketmasin
        const yb = Math.round(m.headTop + m.headH * 0.6);
        const f = Math.max(0.3, Math.min(u, (yb - sw) / (2 * RY)));
        const cx = w * (w < 640 ? 0.5 : 0.56);
        const key = `${w}|${yb}|${f.toFixed(3)}|${m.flip}`;
        const old = prev[gi];
        if (old && old.key === key) {
          // Faqat o'rni o'zgargan (rasm yuklandi va h.k.) — chiziqni qayta qurmasdan suramiz
          old.top = m.top;
          old.svg.style.top = `${m.top}px`;
          return old;
        }
        const pts = ribbonPoints({ w, f, cx, yb, sw }).map(([x, y]) => [m.flip ? w - x : x, y] as Pt);
        const h = Math.ceil(Math.max(...pts.map((p) => p[1])) + sw);
        // Uzunlik — siniq chiziq bo'yicha (nuqtalar zich, egri chiziqdan farqi sezilmaydi)
        let total = 0;
        for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svg.setAttribute("width", String(w));
        svg.setAttribute("height", String(h));
        svg.setAttribute("fill", "none");
        svg.style.cssText = `position:absolute;left:0;top:${m.top}px;display:block;overflow:visible`;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
        el.setAttribute("d", smoothPath(pts));
        el.setAttribute("pathLength", "1");
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("stroke-linejoin", "round");
        el.setAttribute("stroke-width", String(sw));
        el.style.stroke = "var(--ribbon)";
        el.style.strokeDasharray = "1";
        svg.appendChild(el);

        const line: Line = { svg, el, key, top: m.top, h, total, cur: 0, target: 0 };
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
