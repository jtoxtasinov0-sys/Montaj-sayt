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
 * Ramka bo'ylab aylanuvchi yumshoq nur (FXIFY referensi kabi): qarama-qarshi tomonlarda ikkita
 * porlovchi nur dog'i. Har biri ikki qatlam:
 *  - `nb` — keng, xira yorug'lik (karta ichi va tashqarisini yoritadi, chetlari ko'rinmaydi);
 *  - `ne > i` — ramka chizig'ining o'zida yonadigan yorqin, lekin chetlari so'nuvchi nur.
 * Ikkalasi CSS `offset-path` bo'ylab yuradi — burchaklarda ham tezlik bir xil.
 * Yo'l (path), uzunlik va o'lchamni MotionRoot ota elementdan o'lchab qo'yadi.
 * `inside` — ota `overflow: hidden` bo'lsa (tugmalar).
 */
export function Neon({
  tone = "blue",
  inside,
  className,
}: {
  /** accent — pullik ajratish (TOP montajor, ommabop reja) */
  tone?: "blue" | "accent";
  inside?: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("neon", tone === "accent" && "neon-accent", inside && "neon-inside", className)}>
      <i className="nb" />
      <i className="nb nb-2" />
      <span className="ne">
        <i />
        <i className="ne-2" />
      </span>
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
