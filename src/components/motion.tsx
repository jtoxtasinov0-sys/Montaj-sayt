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
 * Nurli ramka (referens: qorong'i qidiruv paneli): pushti va ko'k ranglar ingichka chegara bo'ylab
 * to'xtovsiz aylanadi, atrofidagi yumshoq nur ham shu ranglarda birga aylanadi. Qorong'ida yuqori
 * nuqtasi oqish; yorug' mavzuda — binafsha/pushti.
 * Har qatlamda katta kvadrat konus-gradient (`b`) transform bilan aylanadi (GPU), qatlamning o'zi esa
 * karta shaklida kesilgan — shuning uchun burchaklarda ham silliq, sahifani qayta chizmaydi.
 * Ota elementning orqa fonini qoplaydi (z-index: -1): nur faqat tashqarida ko'rinadi, matn ustida qoladi.
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
      <i className="neon-halo">
        <b />
      </i>
      <i className="neon-glow">
        <b />
      </i>
      <i className="neon-plate" />
      <i className="neon-ring">
        <b />
      </i>
    </span>
  );
}

type Tile = { c: number; r: number; s: number; jx: number; jy: number; o: number } | null;

/**
 * Plitkalar xaritasi. `peak` — o'rtada baland "tepalik" (narx bo'limi), `wave` — notekis zinapoya (hero).
 * Rang plitkada emas: hamma plitka bitta umumiy nur maydonining o'z bo'lagini ko'rsatadi (CSS), shuning
 * uchun binafsha yadro bir necha plitka orqali silliq porlaydi — referensdagi muzli shisha bloklar kabi.
 * Har plitka maydonni bir-ikki piksel siljitib ko'rsatadi (shishadagi sinish) va o'z yaltirashiga ega.
 */
function tileMap(seed: number, cols: number, rows: number, shape: "peak" | "wave") {
  const r = rand(seed);
  let tops: number[];
  if (shape === "peak") {
    const cx = (cols - 1) * 0.47;
    tops = Array.from({ length: cols }, (_, c) => {
      const edge = Math.abs(c - cx) / cx; // 0 — o'rta, 1 — chet
      const noise = Math.floor(r() * 3) - 1;
      // eng baland ustun ham yuqori qatorga chiqmaydi — sarlavha matni ustiga tushmasin
      return Math.max(1, Math.min(rows - 1, Math.round(rows * (0.12 + 0.6 * edge)) + noise));
    });
  } else {
    // Referensdagi zinapoya: ustunlar balandligi notekis to'lqin bo'lib o'zgaradi
    const p1 = r() * Math.PI * 2;
    const p2 = r() * Math.PI * 2;
    tops = Array.from({ length: cols }, (_, c) => {
      const h = 0.5 + 0.24 * Math.sin(c * 0.47 + p1) + 0.13 * Math.sin(c * 1.21 + p2) + (r() - 0.5) * 0.18;
      return Math.max(1, Math.min(rows - 1, rows - Math.round(h * rows)));
    });
  }
  const tiles: Tile[] = [];
  for (let i = 0; i < rows * cols; i++) {
    const row = Math.floor(i / cols);
    const c = i % cols;
    if (row < tops[c]) {
      tiles.push(null);
      continue;
    }
    tiles.push({
      c,
      r: row,
      s: 0.16 + r() * 0.3,
      jx: Math.round((r() - 0.5) * 10),
      jy: Math.round((r() - 0.5) * 10),
      o: row === tops[c] ? 0.75 + r() * 0.2 : 1,
    });
  }
  return tiles;
}

/**
 * Bo'lim foni (ikkala referens):
 *  - `section` — qorong'ida nuqtali to'r (chapda pushti, o'ngda ko'k), yorug'da binafsha shisha plitkalar;
 *  - `dots` — faqat nuqtali to'r (doim qorong'i TOP bo'limi);
 *  - `hero` — shisha plitkalar ikkala mavzuda: yorug'da referensdagidek binafsha muzli shisha,
 *    qorong'ida o'sha shisha qorong'ilikdan porlab chiqadi (chetlari shaffof).
 * `fx`/`fy` — binafsha yadroning plitkalar maydonidagi o'rni (%).
 */
export function Aura({
  seed = 9,
  variant = "section",
  cols = 23,
  rows = 5,
  fx = 47,
  fy = 88,
  className,
}: {
  seed?: number;
  variant?: "section" | "dots" | "hero";
  cols?: number;
  rows?: number;
  fx?: number;
  fy?: number;
  className?: string;
}) {
  const tiles = variant !== "dots" ? tileMap(seed, cols, rows, variant === "hero" ? "wave" : "peak") : null;
  return (
    <div aria-hidden className={cn("aura", `aura-${variant}`, variant === "section" && "aura-tiled", className)}>
      <div className="aura-haze" />
      {variant !== "hero" && <div className="aura-dots" />}
      {tiles && (
        <>
          <div className="aura-cols" />
          <div
            className="aura-tiles"
            style={
              {
                gridTemplateColumns: `repeat(${cols}, var(--tile))`,
                "--cols": cols,
                "--rows": rows,
                "--fx": `${fx}%`,
                "--fy": `${fy}%`,
              } as Css
            }
          >
            {tiles.map((t, i) =>
              t ? (
                <i
                  key={i}
                  style={
                    {
                      "--c": t.c,
                      "--r": t.r,
                      "--s": t.s.toFixed(2),
                      "--jx": `${t.jx}px`,
                      "--jy": `${t.jy}px`,
                      opacity: t.o.toFixed(2),
                    } as Css
                  }
                />
              ) : (
                <i key={i} className="x" />
              ),
            )}
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
