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
 * Nurli ramka (referens: qorong'i qidiruv paneli): chapda pushti, o'ngda ko'k — ingichka gradient
 * chegara, yuqori qirrasi oqish, atrofida shu ranglardagi yumshoq nur. Harakatlanmaydi, faqat asta
 * "nafas oladi". Yorug' mavzuda — binafsha/pushti.
 * Ota elementning orqa fonini qoplaydi (z-index: -1), shuning uchun nur faqat tashqarida ko'rinadi.
 * Qatlamlar: ::before — yaqin nur, .neon-halo — keng nur, .neon-plate — karta foni, ::after — chegara.
 */
export function Neon({
  tone = "blue",
  className,
}: {
  /** accent — pullik ajratish (TOP montajor, ommabop reja): pushti → tilla */
  tone?: "blue" | "accent";
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("neon", tone === "accent" && "neon-accent", className)}>
      <i className="neon-halo" />
      <i className="neon-plate" />
    </span>
  );
}

/**
 * Bo'lim foni (ikkala referens bitta komponentda, mavzuga qarab biri ko'rinadi):
 *  - qorong'i: nuqtali to'r, chapda pushti, o'ngda ko'k rang maydoni bilan bo'yalgan;
 *  - yorug': pastdan ko'tarilgan binafsha shisha plitkalar (zinapoya qirrali) + ingichka ustun chiziqlari.
 * `tiles={false}` — faqat nuqtalar (doim qorong'i bo'limlar uchun).
 */
export function Aura({
  seed = 9,
  tiles = true,
  cols = 23,
  rows = 5,
  className,
}: {
  seed?: number;
  tiles?: boolean;
  cols?: number;
  rows?: number;
  className?: string;
}) {
  const r = rand(seed);
  // Binafsha "yadro" pastki o'rtadan biroz chaproqda (referensdagidek)
  const cx = (cols - 1) * 0.47;
  const cy = rows - 0.8;
  const tops = Array.from({ length: cols }, (_, c) => {
    const edge = Math.abs(c - cx) / cx; // 0 — o'rta, 1 — chet
    const noise = Math.floor(r() * 3) - 1;
    // eng baland ustun ham yuqori qatorga chiqmaydi — sarlavha matni ustiga tushmasin
    return Math.max(1, Math.min(rows - 1, Math.round(rows * (0.12 + 0.6 * edge)) + noise));
  });
  return (
    <div aria-hidden className={cn("aura", tiles && "aura-tiled", className)}>
      <div className="aura-haze" />
      <div className="aura-dots" />
      {tiles && (
        <>
          <div className="aura-cols" />
          <div className="aura-tiles" style={{ gridTemplateColumns: `repeat(${cols}, var(--tile))` } as Css}>
            {Array.from({ length: rows * cols }, (_, i) => {
              const row = Math.floor(i / cols);
              const c = i % cols;
              if (row < tops[c]) return <i key={i} className="x" />;
              const dx = (c - cx) / (cols * 0.36);
              const dy = (row - cy) / (rows * 1.1);
              const near = Math.max(0, 1 - Math.hypot(dx, dy));
              const t = Math.min(96, Math.max(6, Math.pow(near, 0.8) * 96 + (r() - 0.5) * 24));
              // yuqori qirradagi plitkalar biroz xiraroq — "ko'tarilib, eriyotgan" ko'rinish
              const fade = row === tops[c] ? 0.7 + r() * 0.25 : 1;
              return (
                <i
                  key={i}
                  style={
                    {
                      "--t": `${t.toFixed(0)}%`,
                      "--h": `${Math.round(Math.max(0, Math.min(1, (c - cx) / cx + 0.5)) * 100)}%`,
                      opacity: fade.toFixed(2),
                    } as Css
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </div>
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
