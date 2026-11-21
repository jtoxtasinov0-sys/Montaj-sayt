"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Hozir tanlangan band: sahifa havolasi (aria-current) yoki tugma (aria-pressed) */
const ACTIVE = '[data-pill][aria-current="page"],[data-pill][aria-pressed="true"]';

/**
 * Pilla menyu (yuqori menyu, kabinet va admin menyusi, til almashtirgich):
 *  — sichqoncha borganda ostida kulrang shakl paydo bo'ladi va bandlar orasida silliq suriladi;
 *  — bosilganda qora shakl darhol o'sha bandga suriladi (yangi sahifa yuklanguncha kutmaydi);
 *  — tanlangan band doim qora.
 * Ichidagi har bir band: `data-pill` atributi va `pill-item` klassi. Shakllar JS bilan joylanadi;
 * JS ishga tushguncha (SSR) tanlangan band oddiy qora fon bilan chiziladi (globals.css).
 */
export function PillTrack({
  as: Tag = "nav",
  className,
  children,
  ...rest
}: { as?: "nav" | "div"; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const root = useRef<HTMLElement>(null);
  const hover = useRef<HTMLSpanElement>(null);
  const on = useRef<HTMLSpanElement>(null);
  const pressed = useRef<HTMLElement | null>(null);
  const timer = useRef(0);
  const ready = useRef(false);
  const path = usePathname();

  const sync = useCallback(() => {
    const el = root.current;
    if (!el || !on.current) return;
    // Bosilgan band haqiqatan tanlanganga aylandi (sahifa ochildi) yoki ro'yxatdan chiqdi — endi kerak emas
    if (pressed.current && (!el.contains(pressed.current) || pressed.current.matches(ACTIVE))) pressed.current = null;
    const target = pressed.current ?? el.querySelector<HTMLElement>(ACTIVE);
    for (const x of el.querySelectorAll<HTMLElement>("[data-on]")) if (x !== target) x.removeAttribute("data-on");
    target?.setAttribute("data-on", "");
    // Birinchi marta — animatsiyasiz (sahifa ochilganda qora shakl "uchib kelmasin")
    place(on.current, target, !ready.current);
    ready.current = true;
    el.setAttribute("data-ready", "");
  }, []);

  // Har bir chizilishda (masalan, til yoki sahifa o'zgardi) qora shakl joyini tekshiramiz
  useLayoutEffect(sync);

  // Yangi sahifa ochildi: bosilgan holat tugadi; telefonda faol band ko'rinmay qolsa — markazga suramiz
  useLayoutEffect(() => {
    pressed.current = null;
    clearTimeout(timer.current);
    sync();
    const el = root.current;
    const a = el?.querySelector<HTMLElement>(ACTIVE);
    if (el && a && el.scrollWidth > el.clientWidth) {
      el.scrollTo({ left: a.offsetLeft - (el.clientWidth - a.offsetWidth) / 2, behavior: "smooth" });
    }
  }, [path, sync]);

  // Shrift yuklanib, oyna o'lchami o'zgarib bandlar kengligi o'zgarsa — shakl ham moslashadi
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    for (const c of el.querySelectorAll("[data-pill]")) ro.observe(c);
    document.fonts?.ready.then(() => sync()).catch(() => {});
    return () => {
      ro.disconnect();
      clearTimeout(timer.current);
    };
  }, [sync]);

  const itemOf = (e: React.SyntheticEvent) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-pill]");
    return t && root.current?.contains(t) ? t : null;
  };

  const press = (t: HTMLElement | null) => {
    if (!t || t.matches(ACTIVE) || t.hasAttribute("disabled")) return;
    clearTimeout(timer.current);
    pressed.current = t;
    on.current?.setAttribute("data-down", "");
    sync();
  };

  const release = (delay: number) => {
    on.current?.removeAttribute("data-down");
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      pressed.current = null;
      sync();
    }, delay);
  };

  return (
    <Tag
      {...rest}
      ref={root as never}
      className={cn("pill-track", className)}
      onPointerOver={(e) => {
        if (e.pointerType !== "mouse" || !hover.current) return;
        const t = itemOf(e);
        // Bandlar orasidagi bo'shliqda shakl joyida qoladi — miltillamaydi
        if (t) place(hover.current, t, false);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && hover.current) hide(hover.current);
      }}
      onPointerDown={(e) => {
        // Telefonda menyuni surish (skroll) uchun tegilganda qoraymasin — u yerda faqat bosilganda (click)
        if (e.pointerType === "mouse" && e.button === 0) press(itemOf(e));
      }}
      onPointerUp={() => pressed.current && release(450)}
      onPointerCancel={() => pressed.current && release(0)}
      onClick={(e) => {
        const t = itemOf(e);
        if (!t || t.matches(ACTIVE)) return;
        if (pressed.current !== t) press(t);
        const newTab = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
        const href = t.getAttribute("href");
        // Boshqa sahifaga o'tadigan havola yoki tugma — yangi sahifa ochilguncha qora turadi
        const leaves = !newTab && (href ? new URL(href, location.href).pathname !== location.pathname : t.tagName === "BUTTON");
        release(leaves ? 8000 : 350);
      }}
    >
      <span ref={hover} className="pill-ind pill-ind-hover" aria-hidden />
      <span ref={on} className="pill-ind pill-ind-on" aria-hidden />
      {children}
    </Tag>
  );
}

function place(ind: HTMLElement, t: HTMLElement | null, instant: boolean) {
  if (!t || !t.offsetWidth) return hide(ind);
  const shown = ind.hasAttribute("data-shown");
  // Yashirin turgan shakl: joyiga sakrab qo'yiladi, keyin biroz kattalashib paydo bo'ladi
  if (!shown || instant) {
    ind.setAttribute("data-instant", "");
    if (!instant) ind.style.scale = "0.9";
  }
  ind.style.width = `${t.offsetWidth}px`;
  ind.style.height = `${t.offsetHeight}px`;
  ind.style.translate = `${t.offsetLeft}px ${t.offsetTop}px`;
  if (instant) ind.setAttribute("data-shown", "");
  if (ind.hasAttribute("data-instant")) {
    void ind.offsetWidth; // yangi joy animatsiyasiz qo'llansin
    ind.removeAttribute("data-instant");
  }
  ind.style.scale = "";
  ind.setAttribute("data-shown", "");
}

function hide(ind: HTMLElement) {
  ind.removeAttribute("data-shown");
  ind.style.scale = "0.9";
}
