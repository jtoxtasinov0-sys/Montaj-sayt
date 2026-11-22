"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { connectTelegram } from "@/actions/room";

/** "Telegram botni ulash": bot havolasini ochadi (oyna bosilgan zahoti ochiladi — brauzer bloklamasin) */
export function TelegramConnect({ label, again }: { label: string; again?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className={again ? "btn btn-ghost btn-sm" : "btn btn-primary"}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const w = window.open("", "_blank");
          const r = await connectTelegram().catch(() => null);
          setBusy(false);
          if (!r?.ok) {
            w?.close();
            setError(r?.message || "Error");
            return;
          }
          if (w) w.location.href = r.url;
          else window.location.href = r.url;
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {label}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
