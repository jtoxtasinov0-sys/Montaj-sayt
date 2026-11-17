import { Fragment } from "react";
import { cn } from "@/lib/utils";

type Css = React.CSSProperties & Record<`--${string}`, string | number>;

/**
 * So'zma-so'z silliq paydo bo'lish (blur → aniq). JS'siz render bo'ladi:
 * - `load` — sahifa ochilganda darhol (hero);
 * - aks holda ko'rinishga kirganda (MotionRoot `data-in` qo'yadi).
 * Bo'shliqsiz bo'g'inlar ( ) bitta so'z bo'lib qoladi — qator uzilmaydi.
 */
export function SplitText({
  text,
  className,
  wordClassName,
  load,
  delay = 0,
  stagger = 60,
  start = 0,
}: {
  text: string;
  className?: string;
  /** Har bir so'zning ichki qismiga (gradient matn shu yerda bo'lishi kerak) */
  wordClassName?: string;
  load?: boolean;
  delay?: number;
  stagger?: number;
  /** Bir nechta SplitText ketma-ket kelganda — kechikish davom etsin */
  start?: number;
}) {
  const words = text.split(/[ \t\n]+/).filter(Boolean);
  return (
    <span
      className={cn("split", load && "split-load", className)}
      data-split={load ? undefined : ""}
      style={{ "--d": `${delay}ms`, "--st": `${stagger}ms` } as Css}
    >
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="w" style={{ "--i": i + start } as Css}>
            {wordClassName ? <span className={wordClassName}>{w}</span> : w}
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </span>
  );
}

/**
 * Ramka bo'ylab aylanib yuruvchi neon nur. Ota element `position: relative` va
 * `border-radius` ga ega bo'lishi kerak (nur shu radiusni oladi).
 * `inside` — ota `overflow: hidden` bo'lsa, nur chegaraning ichki tomonida chiziladi.
 */
export function Neon({
  tone = "soft",
  inside,
  twin,
  speed,
  phase = 0,
  className,
}: {
  tone?: "soft" | "bright" | "accent" | "primary";
  inside?: boolean;
  /** Ikki qarama-qarshi nur */
  twin?: boolean;
  /** Bir aylanish, soniya */
  speed?: number;
  /** 0..1 — kartalar bir xil joydan boshlamasin */
  phase?: number;
  className?: string;
}) {
  const dur = speed ?? (tone === "soft" ? 9 : 6);
  return (
    <span
      aria-hidden
      className={cn("neon", `neon-${tone}`, inside && "neon-inside", twin && "neon-twin", className)}
      style={{ "--dur": `${dur}s`, "--neon-d": `${-(phase * dur).toFixed(2)}s` } as Css}
    >
      <span />
    </span>
  );
}

/** Deterministik tasodif — server va klientda bir xil natija */
function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Sekin ko'tariluvchi chang zarrachalari */
export function Particles({ count = 22, seed = 7, className }: { count?: number; seed?: number; className?: string }) {
  const r = rand(seed);
  return (
    <div aria-hidden className={cn("particles pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {Array.from({ length: count }, (_, i) => {
        const size = 1 + r() * 2.2;
        return (
          <span
            key={i}
            style={
              {
                "--x": `${(r() * 100).toFixed(2)}%`,
                "--y": `${(20 + r() * 80).toFixed(2)}%`,
                "--s": `${size.toFixed(2)}px`,
                "--t": `${(7 + r() * 9).toFixed(2)}s`,
                "--pd": `${(-r() * 16).toFixed(2)}s`,
                "--o": (0.35 + r() * 0.6).toFixed(2),
              } as Css
            }
          />
        );
      })}
    </div>
  );
}

/** Perspektivali to'r pol + unda yuguruvchi nurlar (narx bo'limlari ostida) */
export function Floor({ className, beams = 7 }: { className?: string; beams?: number }) {
  const r = rand(beams * 31);
  return (
    <div aria-hidden className={cn("floor", className)}>
      <div className="floor-plane">
        {Array.from({ length: beams }, (_, i) => {
          // to'r chiziqlari 20 ta ustunga bo'lingan — nurlar aynan chiziq ustidan yuradi
          const col = 3 + Math.floor(r() * 15);
          return (
            <span
              key={i}
              className="floor-beam"
              style={{ "--x": `${col * 5}%`, "--t": `${(3.2 + r() * 3).toFixed(2)}s`, "--bd": `${(-r() * 6).toFixed(2)}s` } as Css}
            />
          );
        })}
        <span className="floor-sweep" />
      </div>
      <div className="floor-glow" />
    </div>
  );
}

/** FAQ yonidagi yonib-o'chuvchi piksel to'r */
export function PixelGrid({ cols = 9, rows = 6, seed = 3, className }: { cols?: number; rows?: number; seed?: number; className?: string }) {
  const r = rand(seed);
  return (
    <div
      aria-hidden
      className={cn("pixels", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, var(--px))` } as Css}
    >
      {Array.from({ length: cols * rows }, (_, i) => {
        const lit = r() < 0.22;
        return (
          <span
            key={i}
            className={lit ? "on" : undefined}
            style={lit ? ({ "--pd": `${(r() * 6).toFixed(2)}s`, "--t": `${(4 + r() * 4).toFixed(2)}s` } as Css) : undefined}
          />
        );
      })}
    </div>
  );
}
