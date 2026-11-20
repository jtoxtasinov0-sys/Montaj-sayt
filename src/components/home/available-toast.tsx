"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Nymera'dagi "Anna is available for hire" g'oyasi: bo'sh TOP montajor haqida kichik bildirishnoma */
export function AvailableToast({
  name,
  slug,
  avatar,
  text,
  cta,
  closeLabel,
}: {
  name: string;
  slug: string;
  avatar: React.ReactNode;
  text: string;
  cta: string;
  closeLabel: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("toast-dismissed")) return;
    } catch {}
    // Birinchi ekran (hero) toza qolsin: foydalanuvchi pastga tushgandan keyingina chiqadi
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.8) return;
      window.removeEventListener("scroll", onScroll);
      setTimeout(() => setShow(true), 1200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  const close = () => {
    setShow(false);
    try {
      sessionStorage.setItem("toast-dismissed", "1");
    } catch {}
  };
  return (
    <div
      className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl border border-line bg-bg p-3 pr-10 text-fg shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]"
      style={{ animation: "toast-in .6s cubic-bezier(.2,.8,.2,1) both", transform: "translateX(-50%)" }}
      role="status"
    >
      {avatar}
      <p className="min-w-0 flex-1 text-sm leading-snug">
        <span className="font-semibold">{name}</span> <span className="text-muted">{text}</span>
      </p>
      <Link href={`/editors/${slug}`} onClick={close} className="btn btn-primary btn-sm shrink-0">
        {cta}
      </Link>
      <button type="button" onClick={close} aria-label={closeLabel} className="absolute top-0.5 right-0.5 grid h-9 w-9 place-items-center rounded-full text-muted hover:text-fg">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
