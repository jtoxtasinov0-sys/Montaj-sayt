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
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
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
      className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-[#141428]/90 p-3 pr-10 text-white shadow-2xl shadow-black/40 backdrop-blur-xl"
      style={{ animation: "toast-in .6s cubic-bezier(.2,.8,.2,1) both", transform: "translateX(-50%)" }}
      role="status"
    >
      {avatar}
      <p className="min-w-0 flex-1 text-sm leading-snug">
        <span className="font-semibold">{name}</span> <span className="text-white/70">{text}</span>
      </p>
      <Link href={`/editors/${slug}`} onClick={close} className="btn btn-light btn-sm shrink-0">
        {cta}
      </Link>
      <button type="button" onClick={close} aria-label={closeLabel} className="absolute top-2 right-2 text-white/60 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
