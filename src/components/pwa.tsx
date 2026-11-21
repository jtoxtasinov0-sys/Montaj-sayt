"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

/**
 * PWA: service worker'ni ro'yxatdan o'tkazish va "Ilovani o'rnatish" taklifi.
 *
 *  - Android / Chrome / Edge: brauzer `beforeinstallprompt` bersa — o'zimizning kichik oynamiz chiqadi, "O'rnatish" bosilsa
 *    brauzerning rasmiy o'rnatish oynasi ochiladi.
 *  - iPhone / iPad (Safari): u yerda o'rnatish tugmasi yo'q — qisqa yo'riqnoma ko'rsatamiz ("Ulashish" → "Bosh ekranga qo'shish").
 *  - Ilova allaqachon o'rnatilgan (standalone rejim) bo'lsa — hech narsa ko'rsatilmaydi.
 *  - Yopilsa — 14 kun qayta chiqmaydi. Footer'dagi "Ilovani o'rnatish" tugmasi esa doim ishlaydi.
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Mode = "prompt" | "ios" | null;

const SNOOZE_KEY = "pwa-install-snoozed";
const SNOOZE_MS = 14 * 86_400_000;
const SHOW_AFTER_MS = 20_000;

// Butun ilova uchun bitta holat: footer tugmasi va pastdagi oyna bir xil ma'lumotni ko'radi
let deferred: InstallEvent | null = null;
let mode: Mode = null;
let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function setOpen(v: boolean) {
  open = v;
  emit();
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS'da faqat Safari (va uning ilovalar ichidagi oynasi) "Bosh ekranga qo'shish"ni qo'llaydi */
function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|Telegram|Instagram|FBAN|FBAV|Line\//i.test(ua);
}

function snoozed() {
  try {
    return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {}
}

/** Footer tugmasi va boshqa joylardan chaqiriladi */
async function install() {
  if (deferred) {
    const ev = deferred;
    deferred = null;
    setOpen(false);
    await ev.prompt().catch(() => {});
    const choice = await ev.userChoice.catch(() => null);
    if (choice?.outcome !== "accepted") snooze();
    // Bu hodisa bir marta ishlatiladi; brauzer keyingi safar yangisini beradi
    mode = null;
    emit();
    return;
  }
  if (mode === "ios") setOpen(true);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") {
    // Dev rejimida eski service worker keshlangan fayllarni ko'rsatib chalg'itmasin
    navigator.serviceWorker
      .getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => {});
    return;
  }
  const reg = () => navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  if (document.readyState === "complete") reg();
  else window.addEventListener("load", reg, { once: true });
}

export function PwaInstall({
  labels,
}: {
  labels: { title: string; text: string; install: string; iosText: string; close: string };
}) {
  const visible = useSyncExternalStore(subscribe, () => open && mode !== null, () => false);
  const current = useSyncExternalStore(subscribe, () => mode, () => null);

  useEffect(() => {
    registerServiceWorker();
    if (isStandalone()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    // Boshqa bildirishnoma (masalan bosh sahifadagi "bo'sh montajor") turgan bo'lsa — u yopilguncha kutamiz
    const showLater = () => {
      if (snoozed()) return;
      clearTimeout(timer);
      const wait = Math.max(0, SHOW_AFTER_MS - (performance.now() - started));
      const tryShow = () => {
        if (!mode) return;
        if (document.querySelector("[data-toast]")) timer = setTimeout(tryShow, 5_000);
        else setOpen(true);
      };
      timer = setTimeout(tryShow, wait);
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallEvent;
      mode = "prompt";
      emit();
      showLater();
    };
    const onInstalled = () => {
      deferred = null;
      mode = null;
      setOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // Sahifa to'liq yuklanmasdan kelgan hodisa (app/layout.tsx dagi kichik skript saqlab qo'ygan)
    const w = window as Window & { __bip?: Event };
    if (w.__bip && !deferred) onPrompt(w.__bip);
    w.__bip = undefined;

    if (isIosSafari()) {
      mode = "ios";
      emit();
      showLater();
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !current) return null;

  const close = () => {
    snooze();
    setOpen(false);
  };

  return (
    <div
      data-toast
      role="dialog"
      aria-label={labels.title}
      className="fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-bg p-3 pr-10 text-fg shadow-[0_12px_40px_-12px_rgba(0,0,0,0.3)]"
      style={{ animation: "toast-in .6s cubic-bezier(.2,.8,.2,1) both", transform: "translateX(-50%)" }}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-line" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{labels.title}</p>
          <p className="mt-0.5 text-[0.8rem] leading-snug text-muted">
            {current === "ios" ? (
              <>
                <Share className="mr-1 inline h-3.5 w-3.5 -translate-y-px" aria-hidden />
                {labels.iosText}
              </>
            ) : (
              labels.text
            )}
          </p>
        </div>
        {current === "prompt" && (
          <button type="button" onClick={install} className="btn btn-primary btn-sm shrink-0">
            <Download className="h-4 w-4" />
            {labels.install}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label={labels.close}
        className="absolute top-0.5 right-0.5 grid h-9 w-9 place-items-center rounded-full text-muted hover:text-fg"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Footer'dagi "Ilovani o'rnatish" — faqat o'rnatish mumkin bo'lganda ko'rinadi */
export function InstallAppButton({ label, className }: { label: string; className?: string }) {
  const available = useSyncExternalStore(subscribe, () => mode !== null, () => false);
  if (!available) return null;
  return (
    <button type="button" onClick={install} className={className}>
      <Download className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
