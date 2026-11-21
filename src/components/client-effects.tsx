"use client";

import { useEffect, useRef, useState } from "react";

const REVEAL = "[data-reveal],[data-split]";
const SCOPE = "[data-anim]";
/**
 * Butun sayt uchun bitta kuzatuvchi:
 * 1) [data-reveal] / [data-split] — ko'rinishga kirganda `data-in` qo'yadi (CSS animatsiyani boshlaydi);
 * 2) [data-anim] — ekrandan uzoqda bo'lsa `data-paused` (cheksiz animatsiyalar to'xtaydi, batareya tejaladi).
 * Gidratatsiyadan oldin hamma narsa ko'rinib turadi: yashirish faqat <html data-io> qo'yilgach ishlaydi,
 * o'sha lahzada ekranda turganlar esa animatsiyasiz darhol ochiladi — miltillash yo'q.
 */
export function MotionRoot() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          reveal.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scope = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.toggleAttribute("data-paused", !e.isIntersecting);
      },
      { rootMargin: "240px 0px" },
    );

    const all = (root: ParentNode, sel: string) => {
      const out: Element[] = root instanceof Element && root.matches(sel) ? [root] : [];
      root.querySelectorAll(sel).forEach((el) => out.push(el));
      return out;
    };

    const collect = (root: ParentNode, initial: boolean) => {
      if (reduced) return;
      const vh = window.innerHeight;
      for (const el of all(root, REVEAL)) {
        if (el.hasAttribute("data-in")) continue;
        if (initial) {
          const r = el.getBoundingClientRect();
          if (r.top < vh && r.bottom > 0) {
            el.setAttribute("data-in", "now");
            continue;
          }
        }
        reveal.observe(el);
      }
      for (const el of all(root, SCOPE)) scope.observe(el);
    };

    collect(document, true);
    if (!reduced) html.setAttribute("data-io", "");

    // "#bo'lim" havolalari ("Qanday ishlaydi") — bo'lim aniq tepada to'xtasin
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const u = new URL(a.href, location.href);
      if (u.origin === location.origin && u.hash.length > 1) pinHash(decodeURIComponent(u.hash.slice(1)));
    };
    document.addEventListener("click", onClick);
    if (location.hash.length > 1) pinHash(decodeURIComponent(location.hash.slice(1)));

    // Sahifalar orasida o'tilganda yangi elementlar ham kuzatiladi
    const forget = (n: Element) => {
      for (const el of all(n, `${REVEAL},${SCOPE}`)) {
        reveal.unobserve(el);
        scope.unobserve(el);
      }
    };
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.removedNodes.forEach((n) => n instanceof Element && forget(n));
        m.addedNodes.forEach((n) => n instanceof Element && collect(n, false));
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", onClick);
      mo.disconnect();
      reveal.disconnect();
      scope.disconnect();
      html.removeAttribute("data-io");
    };
  }, []);
  return null;
}

const USER_SCROLL = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
let unpin: (() => void) | null = null;

/**
 * "#bo'lim" ga o'tilganda bo'limni bir necha lahza joyida ushlab turish.
 * Sabab: ustidagi kontent sakrashdan keyin o'zgaradi (FAQ kartalari o'tib ketilganda ochilib, ~370px uzayadi) —
 * brauzer esa eski joyga skroll qilgan bo'ladi va bo'lim pastda qolib ketadi. Har kadrda tuzatamiz (ko'zga sakrash bilinmaydi),
 * joylashuv tinchigach yoki foydalanuvchi o'zi skroll qilsa — to'xtaydi.
 */
function pinHash(id: string) {
  unpin?.();
  let raf = 0;
  let still = 0;
  const end = performance.now() + 5000;
  const stop = () => {
    cancelAnimationFrame(raf);
    for (const ev of USER_SCROLL) removeEventListener(ev, stop, true);
    unpin = null;
  };
  unpin = stop;
  // Havolani bosgan pointerdown allaqachon o'tgan — keyingi harakatlar foydalanuvchiniki
  for (const ev of USER_SCROLL) addEventListener(ev, stop, { capture: true, passive: true });
  const tick = () => {
    if (performance.now() > end) return stop();
    const el = document.getElementById(id);
    // Boshqa sahifadan kelinsa — yangi sahifa ochilib, manzil o'zgarishini kutamiz
    if (el && location.hash === `#${encodeURIComponent(id)}`) {
      const d = el.getBoundingClientRect().top - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
      const bottom = scrollY >= document.documentElement.scrollHeight - innerHeight - 1;
      if (Math.abs(d) > 2 && !(d > 0 && bottom)) {
        window.scrollTo({ top: scrollY + d, behavior: "instant" });
        still = 0;
      } else if (++still > 45) return stop();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

/** Ko'rinishga kirganda raqamni 0 dan sanab chiqish */
export function CountUp({ to, decimals = 0, suffix = "", duration = 1600 }: { to: number; decimals?: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setVal(0);
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          setVal(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}
