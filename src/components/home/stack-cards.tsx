"use client";

import { useEffect, useRef } from "react";

export type StackCardItem = { key: string; title: string; text: string };

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Karta tepasi ekranning shu qismidan yuqoriga chiqqanda ochiladi (videodagidek ~55%) */
const ON_AT = 0.55;

/** Kartaning to'q holatdagi o'ng tomonidagi naqsh ranglari: tashqi (to'q) → ichki (yorqin binafsha) */
const TONES = ["#1c1f3f", "#252955", "#2f336b", "#3a3c84", "#47469d", "#5651b6"];

/**
 * Har bir karta uchun o'z geometrik naqshi (referens: cuberto.com xizmatlar kartalari):
 * 0 — vertikal ustunlar, 1 — piramida, 2 — doiralar, 3 — ichma-ich to'rtburchaklar, 4 — olti burchak.
 */
function StackArt({ variant }: { variant: number }) {
  const v = variant % 5;
  const layers = [0, 1, 2, 3, 4];
  return (
    <svg className="stack-art" viewBox="0 0 480 240" preserveAspectRatio="xMaxYMax slice" aria-hidden>
      <defs>
        <linearGradient id={`sa-bar-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a5fd0" stopOpacity="0" />
          <stop offset="1" stopColor="#5a5fd0" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`sa-glow-${variant}`} cx="0.7" cy="1" r="0.75">
          <stop offset="0" stopColor="#7a68ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#7a68ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {v === 0 &&
        [0, 1, 2, 3, 4, 5].map((k) => (
          <g key={k}>
            <rect x={216 + k * 44} y={0} width={44} height={240} fill={`url(#sa-bar-${variant})`} opacity={0.25 + k * 0.15} />
            <rect x={216 + k * 44} y={0} width={1} height={240} fill="#fff" opacity={0.07 + k * 0.02} />
          </g>
        ))}
      {v === 1 &&
        layers.map((k) => {
          const hw = 200 - k * 38;
          return <polygon key={k} points={`${330 - hw},250 330,${10 + k * 40} ${330 + hw},250`} fill={TONES[k + 1]} />;
        })}
      {v === 2 && layers.map((k) => <circle key={k} cx={340} cy={262} r={215 - k * 40} fill={TONES[k + 1]} />)}
      {v === 3 &&
        layers.map((k) => {
          const w = 320 - k * 54;
          const h = 210 - k * 38;
          return <rect key={k} x={340 - w / 2} y={262 - h} width={w} height={h} rx={34 - k * 4} fill={TONES[k + 1]} />;
        })}
      {v === 4 &&
        layers.map((k) => {
          const w = 175 - k * 30;
          const top = 18 + k * 38;
          const sh = top + (250 - top) * 0.42;
          return <polygon key={k} points={`${340 - w},252 ${340 - w},${sh} 340,${top} ${340 + w},${sh} ${340 + w},252`} fill={TONES[k + 1]} />;
        })}
      <rect width="480" height="240" fill={`url(#sa-glow-${variant})`} />
    </svg>
  );
}

/**
 * Taxlanadigan kartalar (referens: cuberto.com "What we do" — egasi yuborgan video bo'yicha, birga-bir). Har bir karta sticky:
 *  - pastda: och kulrang, biroz torroq, faqat sarlavha va raqam;
 *  - karta ekranning ~55% balandligidan yuqoriga o'tganda `is-on` oladi va ~0.6 soniyada o'zi
 *    och kulrang → kulrang → to'q ko'kka o'tadi, ochiladi (javob matni chiqadi), o'ng tomonida o'z naqshi paydo bo'ladi;
 *    yuqoriga qaytilganda xuddi shunday yopiladi;
 *  - tepaga yetgach yopishib qoladi, ustiga keyingi karta chiqqanda biroz kichrayadi va qorayadi (--c, skroll bilan) —
 *    tepada oldingi kartalarning ingichka chetlari taxlanib turadi.
 * Harakat kamaytirilgan rejimda hammasi ochiq, animatsiyasiz.
 */
export function StackCards({ items }: { items: StackCardItem[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cards = [...el.querySelectorAll<HTMLElement>("[data-stack]")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cards.forEach((c) => {
        c.classList.add("is-on");
        c.style.setProperty("--bh", "none");
      });
      return;
    }
    let tops: number[] = [];
    let raf = 0;
    const measure = () => {
      tops = cards.map((c) => parseFloat(getComputedStyle(c.parentElement!).top) || 0);
      // Ochiladigan qism balandligi (max-height o'tishi uchun)
      cards.forEach((c) => {
        const inner = c.querySelector<HTMLElement>("[data-stack-body]")?.firstElementChild as HTMLElement | null;
        if (inner) c.style.setProperty("--bh", `${inner.offsetHeight}px`);
      });
    };
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const rects = cards.map((c) => c.parentElement!.getBoundingClientRect());
      cards.forEach((card, i) => {
        const r = rects[i];
        card.classList.toggle("is-on", r.top < vh * ON_AT);
        const next = rects[i + 1];
        const c = next ? clamp(1 - (next.top - tops[i + 1]) / Math.max(1, r.height)) : 0;
        card.parentElement!.style.setProperty("--c", c.toFixed(3));
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
    // Shrift yuklangach matn balandligi o'zgarishi mumkin
    document.fonts?.ready.then(onResize).catch(() => {});
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    // overflow-anchor: none — kartalar ochilganda brauzer skrollni "tuzatib" sakratmasin
    <div ref={root} className="[overflow-anchor:none] [--stack-top:5rem] sm:[--stack-top:6.25rem]">
      {items.map((it, i) => (
        <div key={it.key} className="stack-item" style={{ "--i": i } as React.CSSProperties}>
          <article data-stack className="stack-card">
            <StackArt variant={i} />
            <div className="flex items-start justify-between gap-6">
              <h3 className="text-xl leading-snug font-normal tracking-tight text-balance sm:text-[1.75rem] sm:leading-tight">{it.title}</h3>
              <span className="stack-num font-mono text-sm">{String(i + 1).padStart(2, "0")}</span>
            </div>
            {/* Ochiladigan qism: pastda yashirin, karta ochilganda balandligi bilan birga chiqadi */}
            <div data-stack-body className="stack-body">
              <div>
                <p className="stack-text max-w-xl pt-4 text-[0.95rem] leading-relaxed sm:max-w-[34rem] sm:pt-5">{it.text}</p>
              </div>
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}
