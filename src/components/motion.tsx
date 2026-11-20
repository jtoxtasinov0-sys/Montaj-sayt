import { Fragment } from "react";
import { cn } from "@/lib/utils";

type Css = React.CSSProperties & Record<`--${string}`, string | number>;

/**
 * So'zma-so'z sokin paydo bo'lish (opacity + biroz yuqoriga). JS'siz render bo'ladi:
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
  /** Har bir so'zning ichki qismiga */
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
 * Gemini'da chizilgan ingichka chiziqli ikonka (public/images/icons/glyphs-v2.svg, potrace bilan vektorlashtirilgan).
 * Rangi matn rangidan — mavzu bilan almashadi. `.glyph-host` ichida bo'lsa, kursor olib borilganda ikonka
 * o'zini qaytadan chizadi (avval chiziq bo'ylab, keyin to'ladi); ko'rinishga kirganda ham bir marta chiziladi.
 */
export function GlyphIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 1024 1024" className={cn("glyph", className)}>
      <use href={`/images/icons/glyphs-v2.svg#${name}`} />
    </svg>
  );
}
