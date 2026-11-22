"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/** Bu sahifalarga "orqaga" qaytarmaymiz: kirish sahifasi va (buyurtma joylangach) bo'sh buyurtma formasi */
const SKIP_BACK_TO = [/^\/login(?:\/|$)/, /^\/orders\/new(?:\/|$)/];

type NavEntry = { url: string | null };
type NavigationLike = { canGoBack?: boolean; currentEntry?: { index: number } | null; entries?: () => NavEntry[] };

/** Tarixdagi oldingi sahifa shu saytning o'zidami va unga qaytish ma'qulmi */
function canGoBackInSite(): boolean {
  try {
    const nav = (window as unknown as { navigation?: NavigationLike }).navigation;
    // Navigation API (Chrome, Edge, yangi Safari/Firefox): faqat shu saytning ketma-ket yozuvlarini ko'radi
    if (nav && typeof nav.canGoBack === "boolean") {
      if (!nav.canGoBack) return false;
      const i = nav.currentEntry?.index ?? -1;
      const prevUrl = i > 0 ? nav.entries?.()[i - 1]?.url : null;
      if (!prevUrl) return true;
      const prev = new URL(prevUrl);
      if (prev.origin !== location.origin) return false;
      return !SKIP_BACK_TO.some((re) => re.test(prev.pathname)) && prev.href !== location.href;
    }
    // Eski brauzerlar: sahifaga saytning o'zidan kelingan bo'lsa
    if (window.history.length < 2 || !document.referrer) return false;
    const ref = new URL(document.referrer);
    return ref.origin === location.origin && !SKIP_BACK_TO.some((re) => re.test(ref.pathname));
  } catch {
    return false;
  }
}

/**
 * "Orqaga" tugmasi. Ilova (PWA) o'rnatilgan oynada brauzerning orqaga tugmasi yo'q — shu uchun sahifaning o'zida.
 * Saytdan kelingan bo'lsa — tarix bo'yicha orqaga (filtr, sahifa va scroll joyi saqlanadi);
 * havola orqali to'g'ridan-to'g'ri ochilgan bo'lsa (yoki oldingi sahifa kirish/forma bo'lsa) — `fallback` sahifaga o'tadi.
 * JS yuklanmagan bo'lsa ham oddiy havola sifatida ishlaydi.
 */
export function BackButton({ fallback, label, className }: { fallback: string; label: string; className?: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      prefetch={false}
      onClick={(e) => {
        // Ctrl/Cmd/o'rta tugma — yangi oynada ochish: brauzerning o'ziga qoldiramiz
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (!canGoBackInSite()) return;
        e.preventDefault();
        router.back();
      }}
      className={cn(
        "group inline-flex h-9 items-center gap-2 rounded-full border border-line-strong py-0 pr-4 pl-3 text-sm text-muted transition-colors hover:border-fg hover:text-fg",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:-translate-x-0.5" aria-hidden />
      {label}
    </Link>
  );
}
