"use client";

import { useEffect } from "react";

/**
 * Oyna (video, mobil menyu) ochiqligida orqadagi sahifani skroll qilib bo'lmasin.
 *
 * `body { overflow: hidden }` iPhone Safari'da ishlamaydi — barmoq bilan surilsa sahifa baribir yuradi.
 * Shuning uchun body'ni turgan joyida "muzlatamiz" (position: fixed + top: -scrollY), yopilganda
 * aynan o'sha joyga qaytaramiz. Bir nechta oyna bir vaqtda ochilsa ham to'g'ri ishlaydi (hisoblagich).
 */

let locks = 0;
let savedY = 0;

function lock() {
  if (locks++ > 0) return;
  savedY = window.scrollY;
  const html = document.documentElement;
  const b = document.body.style;
  // Kompyuterda skroll chizig'i yo'qolganda sahifa o'ngga "sakramasin"
  const bar = window.innerWidth - html.clientWidth;
  html.style.overflow = "hidden";
  b.position = "fixed";
  b.top = `-${savedY}px`;
  b.left = "0";
  b.right = "0";
  b.width = "100%";
  if (bar > 0) b.paddingRight = `${bar}px`;
}

function unlock() {
  if (locks === 0 || --locks > 0) return;
  const b = document.body.style;
  document.documentElement.style.overflow = "";
  b.position = b.top = b.left = b.right = b.width = b.paddingRight = "";
  // "instant": globals.css dagi smooth skroll sahifani sekin surib qo'ymasin
  window.scrollTo({ top: savedY, behavior: "instant" });
}

/** Sahifa qulflangan bo'lsa ham haqiqiy skroll joyi (masalan header "skroll qilingan" ko'rinishini saqlashi uchun) */
export function pageScrollY() {
  return locks > 0 ? savedY : window.scrollY;
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
