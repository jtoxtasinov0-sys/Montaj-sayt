"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/actions/locale";
import { cn } from "@/lib/utils";

const LABELS = { uz: "O‘z", ru: "Ру", en: "En" } as const;

export function LangSwitcher({ current, label }: { current: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex h-10 items-center gap-0.5 rounded-full border border-line p-1", pending && "opacity-60")}
    >
      <Globe className="mx-1.5 hidden h-4 w-4 text-muted sm:block" aria-hidden />
      {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={current === l}
          onClick={() =>
            start(async () => {
              await setLocale(l);
              router.refresh();
            })
          }
          className={cn(
            "h-8 rounded-full px-2.5 text-xs font-medium transition",
            current === l ? "bg-fg text-bg" : "text-muted hover:text-fg",
          )}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
