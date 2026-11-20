"use client";

import { useEffect, useRef, useState } from "react";
import { GlyphIcon } from "@/components/motion";
import { cn } from "@/lib/utils";

/** Gemini'da chizilgan hero illyustratsiyalari (glyphs-v2.svg dagi nomlar) */
const ART = ["h-reel", "h-camera", "h-clapper", "h-desk"] as const;
/** Chizilib bo'lgach shuncha turadi, keyin o'chib, keyingisi chiziladi */
const HOLD_MS = 6500;
const OUT_MS = 750;

/**
 * Hero'dagi almashib turuvchi illyustratsiya: har kirganda tasodifiy biridan boshlanadi, keyin navbat bilan
 * almashadi — eskisi chiziq bo'ylab o'chadi, yangisi o'zini chizadi. Kursor ustida turganda almashmaydi
 * (o'sha paytda hover — qaytadan chizilish ishlaydi). Harakat kamaytirilgan rejimda faqat tasodifiy bittasi.
 */
export function HeroArt({ className }: { className?: string }) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);
  const hovered = useRef(false);

  useEffect(() => {
    let idx = Math.floor(Math.random() * ART.length);
    setI(idx);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        if (hovered.current) return next();
        setOut(true);
        t = setTimeout(() => {
          idx = (idx + 1) % ART.length;
          setI(idx);
          setOut(false);
          next();
        }, OUT_MS);
      }, HOLD_MS);
    };
    next();
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      aria-hidden
      onPointerEnter={() => (hovered.current = true)}
      onPointerLeave={() => (hovered.current = false)}
      className={cn("glyph-host glyph-load", out && "glyph-out", className)}
    >
      {/* key — yangi rasm qayta o'rnatiladi va chizilish animatsiyasi boshidan boshlanadi */}
      <GlyphIcon key={ART[i]} name={ART[i]} className="h-[clamp(14rem,22vw,20rem)] w-[clamp(14rem,22vw,20rem)] [stroke-width:30]" />
    </div>
  );
}
