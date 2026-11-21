"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormAction } from "@/lib/action-types";
import { LIMITS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Kabinetdagi video kartochkasida "Muqovani almashtirish": rasm tanlanishi bilan darhol yuboriladi.
 * Hajm va turi brauzerning o'zida tekshiriladi — katta fayl serverga umuman ketmaydi.
 */
export function CoverButton({
  action,
  labels,
  className,
}: {
  action: FormAction;
  labels: { change: string; errType: string; errSize: string };
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(state && !state.ok ? state.message : null);
  }, [state]);

  // Xato xabari bir necha soniyadan keyin o'zi yo'qoladi
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5_000);
    return () => clearTimeout(t);
  }, [error]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const bad = f.type && !TYPES.includes(f.type) ? labels.errType : f.size > LIMITS.uploadBytes ? labels.errSize : null;
    if (bad) {
      setError(bad);
      e.target.value = "";
      return;
    }
    setError(null);
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction} className={className}>
      <label
        title={labels.change}
        className={cn(
          "btn btn-light btn-sm !h-8 !w-8 cursor-pointer !p-0 shadow-sm focus-within:ring-2 focus-within:ring-fg",
          pending && "pointer-events-none opacity-70",
        )}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        <span className="sr-only">{labels.change}</span>
        <input
          type="file"
          name="cover"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          className="sr-only"
        />
      </label>
      {error && (
        <p role="alert" className="fade-up absolute top-10 right-0 z-10 w-56 rounded-xl bg-danger px-3 py-2 text-xs text-white shadow-lg">
          {error}
        </p>
      )}
    </form>
  );
}
