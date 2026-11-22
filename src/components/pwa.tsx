"use client";

import { Check, ChevronDown, Copy, Download, EllipsisVertical, Lock, MonitorDown, Share, Star, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useScrollLock } from "@/lib/scroll-lock";

/**
 * PWA: service worker'ni ro'yxatdan o'tkazish va "Ilovani o'rnatish" taklifi.
 *
 *  - Android / Chrome / Edge: brauzer `beforeinstallprompt` bersa — o'zimizning kichik oynamiz chiqadi, "O'rnatish" bosilsa
 *    brauzerning rasmiy o'rnatish oynasi ochiladi.
 *  - iPhone / iPad (Safari): u yerda o'rnatish tugmasi yo'q — qisqa yo'riqnoma ko'rsatamiz ("Ulashish" → "Bosh ekranga qo'shish").
 *  - Ilova allaqachon o'rnatilgan (standalone rejim) bo'lsa — hech narsa ko'rsatilmaydi.
 *  - Yopilsa — 14 kun qayta chiqmaydi.
 *
 * Bosh sahifa, kabinet, mobil menyu va footer'dagi "O'rnatish" tugmasi (InstallAppButton) doim ko'rinadi (ilova ichida ochilganidan
 * tashqari). Brauzer o'rnatishni taklif qilgan bo'lsa — rasmiy oyna; aks holda shu brauzer uchun qo'lda o'rnatish
 * yo'riqnomasi. Brauzer taklif qilmasligining eng ko'p sababi: ilova oldin o'rnatilgan, faqat ish stolidagi ikonkasi
 * o'chirilgan — buni yo'riqnoma alohida tushuntiradi.
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Mode = "prompt" | "ios" | null;
type Guide = "desktop" | "android" | "ios" | "inapp" | "unsupported";

export type PwaLabels = {
  title: string;
  text: string;
  install: string;
  iosText: string;
  close: string;
  copy: string;
  copied: string;
  helpTitle: string;
  guide: Record<Guide, string[]>;
  noIcon: string;
  noIconText: string;
  reinstallLead: string;
  reinstall: string[];
  installedTitle: string;
  installedText: string;
};

const SNOOZE_KEY = "pwa-install-snoozed";
const SNOOZE_MS = 14 * 86_400_000;
const SHOW_AFTER_MS = 20_000;

// Butun ilova uchun bitta holat: footer tugmasi va pastdagi oyna bir xil ma'lumotni ko'radi
let deferred: InstallEvent | null = null;
let mode: Mode = null;
let open = false;
let help = false;
let standalone = false;
/** Shu brauzerda ilova o'rnatilganmi (getInstalledRelatedApps; hamma brauzer bilmaydi — bilmasa false) */
let installed = false;
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

function setHelp(v: boolean) {
  help = v;
  emit();
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** Ilovalar ichidagi brauzerlar (Telegram, Instagram, Facebook, Android WebView) — ular saytni o'rnata olmaydi */
const IN_APP = /Telegram|Instagram|FBAN|FBAV|FB_IAB|Line\/|; wv\)/i;

/** iOS'da faqat Safari (va uning ilovalar ichidagi oynasi) "Bosh ekranga qo'shish"ni qo'llaydi */
function isIosSafari() {
  const ua = navigator.userAgent;
  return isIos() && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(ua) && !IN_APP.test(ua);
}

/** Qo'lda o'rnatish yo'riqnomasining qaysi varianti shu brauzerga to'g'ri keladi */
function guideFor(): Guide {
  const ua = navigator.userAgent;
  if (IN_APP.test(ua)) return "inapp";
  // iOS 16.4+ da istalgan brauzerning "Ulashish" menyusida "Bosh ekranga qo'shish" bor
  if (isIos()) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Firefox\//.test(ua)) return "unsupported";
  // Chrome, Edge, Yandex, Opera — hammasi Chromium
  if (/Chrome\/|Edg\//.test(ua)) return "desktop";
  return "unsupported";
}

/** Brauzerning o'rnatilgan ilovalar sahifasi (u yerdan ilovani butunlay o'chirib, qayta o'rnatish mumkin) */
const appsPage = () => (/Edg\//.test(navigator.userAgent) ? "edge://apps" : "chrome://apps");

type RelatedApps = Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
function detectInstalled() {
  (navigator as RelatedApps)
    .getInstalledRelatedApps?.()
    .then((apps) => {
      installed = apps.length > 0;
      emit();
    })
    .catch(() => {});
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

/** "O'rnatish" tugmalari: brauzer taklif qilgan bo'lsa — rasmiy oyna, aks holda — qo'lda o'rnatish yo'riqnomasi */
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
  setOpen(false);
  setHelp(true);
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
  labels: PwaLabels;
}) {
  const visible = useSyncExternalStore(subscribe, () => open && mode !== null, () => false);
  const current = useSyncExternalStore(subscribe, () => mode, () => null);
  const helpOpen = useSyncExternalStore(subscribe, () => help, () => false);

  useEffect(() => {
    registerServiceWorker();
    if (isStandalone()) {
      // Ilova ichida "O'rnatish" tugmalari kerak emas
      standalone = true;
      emit();
      return;
    }
    detectInstalled();

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
      installed = true;
      open = false;
      setHelp(false);
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

  const close = () => {
    snooze();
    setOpen(false);
  };

  return (
    <>
      {visible && current && <InstallToast labels={labels} current={current} onClose={close} />}
      {helpOpen && <InstallHelp labels={labels} />}
    </>
  );
}

/** Pastdan chiqadigan kichik taklif (20 soniyadan keyin, 14 kunda bir marta) */
function InstallToast({ labels, current, onClose: close }: { labels: PwaLabels; current: NonNullable<Mode>; onClose: () => void }) {
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

const closeHelp = () => setHelp(false);

/** Raqamli qadamlar ro'yxati (1, 2, 3 …) */
function Steps({ items, children }: { items: string[]; children?: (i: number) => React.ReactNode }) {
  return (
    <ol className="space-y-3">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 text-sm leading-snug">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fg text-[0.75rem] font-semibold text-bg">{i + 1}</span>
          <span className="min-w-0 flex-1 pt-0.5">
            {t}
            {children?.(i)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Kompyuter brauzerining manzil satri — o'rnatish belgisi qayerda ekanini ko'rsatish uchun kichik rasm */
function AddressBar() {
  const [host] = useState(() => location.host);
  return (
    <div aria-hidden className="mt-3 flex items-center gap-2 rounded-full border border-line bg-fg/[0.04] py-1.5 pr-1.5 pl-3 text-[0.8rem] text-muted">
      <Lock className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{host}</span>
      <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fg text-bg">
        <span className="absolute inset-0 animate-ping rounded-full bg-fg/40" />
        <MonitorDown className="relative h-4 w-4" />
      </span>
      <Star className="h-4 w-4 shrink-0" />
      <EllipsisVertical className="h-4 w-4 shrink-0" />
    </div>
  );
}

/** Brauzer o'zi taklif qilmaganda: shu brauzerda qanday o'rnatish — qisqa raqamli qadamlar */
function InstallHelp({ labels }: { labels: PwaLabels }) {
  const isInstalled = useSyncExternalStore(subscribe, () => installed, () => false);
  // Oyna faqat tugma bosilganda (brauzerda) ochiladi — navigator shu yerda bor
  const [guide] = useState(guideFor);
  const [apps] = useState(appsPage);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useScrollLock(true);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeHelp();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const desktop = guide === "desktop";
  const showInstalled = desktop && isInstalled;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(apps);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Kompyuterda: ilovani butunlay o'chirib, qayta o'rnatish (ish stolidagi ikonkani o'chirish ilovani o'chirmaydi)
  const reinstall = (
    <Steps items={labels.reinstall}>
      {(i) =>
        i === 0 && (
          <span className="mt-2 flex items-center gap-2">
            <code className="rounded-lg bg-fg/[0.06] px-2.5 py-1.5 font-mono text-[0.85rem]">{apps}</code>
            <button type="button" onClick={copy} className="btn btn-ghost btn-sm !h-8 !px-3">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? labels.copied : labels.copy}
            </button>
          </span>
        )
      }
    </Steps>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={closeHelp}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-help-title"
        onClick={(e) => e.stopPropagation()}
        className="fade-up relative max-h-full w-full max-w-sm overflow-y-auto rounded-2xl border border-line bg-bg p-5 text-fg shadow-[0_12px_40px_-12px_rgba(0,0,0,0.3)]"
        style={{ animationDuration: ".45s" }}
      >
        <div className="flex items-center gap-3 pr-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-line" />
          <h2 id="pwa-help-title" className="text-base leading-snug font-semibold">
            {showInstalled ? labels.installedTitle : labels.helpTitle}
          </h2>
        </div>

        <div className="mt-5">
          {showInstalled ? (
            <>
              <p className="text-sm leading-snug">{labels.installedText}</p>
              <p className="mt-5 mb-3 text-sm font-medium">{labels.reinstallLead}</p>
              {reinstall}
            </>
          ) : (
            <>
              <Steps items={labels.guide[guide]}>{(i) => desktop && i === 0 && <AddressBar />}</Steps>
              {desktop && (
                <details className="group mt-5 rounded-xl border border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    {labels.noIcon}
                    <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-line px-3 pt-3 pb-3.5">
                    <p className="mb-3 text-[0.8rem] leading-snug text-muted">{labels.noIconText}</p>
                    {reinstall}
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        <button type="button" onClick={closeHelp} className="btn btn-primary mt-6 w-full">
          {labels.close}
        </button>
        <button
          ref={closeRef}
          type="button"
          onClick={closeHelp}
          aria-label={labels.close}
          className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full text-muted hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * "O'rnatish" tugmasi (bosh sahifa, kabinet, mobil menyu, footer). Doim ko'rinadi — faqat sayt ilova sifatida ochilganda yashirinadi.
 * `title` berilsa — tugmaning to'liq nomi (matn tor ekranda yashirilganda ham ekran o'qigichlarga aytiladi).
 */
export function InstallAppButton({
  label,
  title,
  className,
  iconClassName = "h-3.5 w-3.5",
  labelClassName,
}: {
  label: string;
  title?: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}) {
  const hidden = useSyncExternalStore(subscribe, () => standalone, () => false);
  if (hidden) return null;
  return (
    <button type="button" onClick={install} className={className} title={title} aria-label={title}>
      <Download className={iconClassName} aria-hidden />
      <span className={labelClassName}>{label}</span>
    </button>
  );
}
