"use client";

import { Scissors } from "lucide-react";
import { useEffect, useRef } from "react";

/** Taymlayn sikli (ms) — CSS'dagi --tl-dur bilan bir xil bo'lishi shart */
const LOOP_MS = 6000;
const FPS = 25;
const START_S = 12;
/** Audio trek to'lqini (balandlik, %) — qat'iy qiymatlar, server va klientda bir xil */
const WAVE = [
  22, 85, 37, 43, 25, 45, 66, 52, 88, 30, 62, 25, 36, 41, 69, 73, 60, 71, 31, 26, 23, 69, 45, 83, 62, 54, 41, 24, 54, 27, 89,
  37, 77, 43, 32, 33, 43, 78, 38, 89, 27, 53, 24, 42, 54, 63, 82, 45, 68, 23, 28, 31, 72, 59, 73, 69, 41, 35, 25, 63, 30, 89,
  51, 66,
];

function timecode(ms: number) {
  const totalFrames = Math.floor(((START_S * 1000 + ms) / 1000) * FPS);
  const ff = totalFrames % FPS;
  const ss = Math.floor(totalFrames / FPS) % 60;
  const mm = Math.floor(totalFrames / FPS / 60) % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `00:${p(mm)}:${p(ss)}:${p(ff)}`;
}

/** Klapper (3D render) + jonli montaj taymlayni: pleyhed yuradi, klipni kesadi, taymkod sanaydi */
export function HeroVisual() {
  const root = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const tc = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let visible = true;
    let raf = 0;
    let last = "";

    // Ekrandan tashqarida yoki tab yashirin bo'lsa — animatsiyalar to'xtaydi
    const sync = () => {
      const paused = !visible || document.hidden;
      el.toggleAttribute("data-paused", paused);
      cancelAnimationFrame(raf);
      if (!paused) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      // Taymkod CSS pleyhed animatsiyasining aynan o'sha vaqtidan olinadi — doim sinxron.
      // Animatsiya yo'q bo'lsa (reduced motion) — kesish lahzasidagi statik kadr.
      const anim = head.current?.getAnimations()[0];
      const running = anim && typeof anim.currentTime === "number";
      const next = timecode(running ? (anim.currentTime as number) % LOOP_MS : LOOP_MS * 0.64);
      if (next !== last && tc.current) tc.current.textContent = last = next;
      if (running) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={root} className="hero-visual relative mx-auto aspect-square w-full max-w-[26rem] lg:max-w-none" aria-hidden>
      <div className="absolute inset-[14%] rounded-full bg-primary/30 blur-[90px]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-clapper.webp"
        alt=""
        width={1024}
        height={1024}
        fetchPriority="high"
        decoding="async"
        className="animate-float relative h-full w-full object-contain mix-blend-screen [mask-image:radial-gradient(circle_at_50%_50%,#000_55%,transparent_72%)]"
      />

      {/* Montaj taymlayni */}
      <div
        className="fade-up absolute inset-x-[2%] bottom-[2%] rounded-2xl border border-white/10 bg-[#0a0a1f]/70 p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md sm:inset-x-[4%] sm:p-3.5 lg:right-[8%] lg:left-[-6%]"
        style={{ animationDelay: "0.9s" }}
      >
        <div className="mb-2.5 flex items-center justify-between text-[0.7rem] text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
            <span ref={tc} className="font-medium text-fg tabular-nums">
              00:00:12:00
            </span>
          </span>
          <Scissors className="tl-scissors h-3.5 w-3.5" />
        </div>

        <div className="flex gap-2">
          <div className="flex w-5 flex-col gap-1.5 text-[0.6rem] leading-none text-muted">
            <span className="tl-label">V2</span>
            <span className="tl-label">V1</span>
            <span className="tl-label">A1</span>
          </div>

          <div className="relative flex flex-1 flex-col gap-1.5">
            <div className="tl-track">
              <span className="tl-clip left-[6%] w-[20%] bg-primary-2/55" />
              <span className="tl-clip left-[44%] w-[30%] bg-primary-2/55" />
            </div>
            <div className="tl-track">
              <span className="tl-clip left-0 w-[33%] bg-primary" />
              {/* Kesiladigan klip: ikki bo'lak birga turadi, pleyhed 62% ga yetganda ajraladi */}
              <span className="tl-clip left-[34%] w-[28%] rounded-r-none bg-primary" />
              <span className="tl-clip tl-cut-right left-[62%] w-[38%] rounded-l-none bg-primary" />
              <span className="tl-flash left-[62%]" />
            </div>
            <div className="tl-track flex items-center gap-px px-0.5">
              {WAVE.map((h, i) => (
                <span key={i} className="flex-1 rounded-full bg-accent/70" style={{ height: `${h}%` }} />
              ))}
            </div>

            {/* Pleyhed: faqat trek maydoni bo'ylab yuradi */}
            <div ref={head} className="tl-playhead pointer-events-none absolute inset-0">
              <span className="absolute -top-1.5 -bottom-1 left-0 w-px -translate-x-1/2 bg-accent shadow-[0_0_10px_var(--accent)]" />
              <span className="absolute -top-2.5 left-0 h-2 w-2 -translate-x-1/2 rounded-[2px] bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
