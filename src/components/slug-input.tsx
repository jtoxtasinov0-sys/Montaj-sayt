"use client";

import { useState } from "react";

/** Profil havolasi (nik) maydoni: yozilgan sari to'liq havola ko'rinib turadi — "manzil" deb yashash joyini yozib qo'yishmasin */
export function SlugInput({ defaultValue, base }: { defaultValue: string; base: string }) {
  const [v, setV] = useState(defaultValue);
  return (
    <>
      <input
        name="slug"
        required
        minLength={3}
        maxLength={40}
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={v}
        onChange={(e) => setV(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
        className="input font-mono"
      />
      <p className="mt-1.5 truncate font-mono text-xs text-muted">
        {base}/editors/<span className="text-fg">{v || "…"}</span>
      </p>
    </>
  );
}
