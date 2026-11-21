"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/actions/locale";
import { cn } from "@/lib/utils";
import { PillTrack } from "./pill-track";

const LABELS = { uz: "O‘z", ru: "Ру", en: "En" } as const;

export function LangSwitcher({ current, label }: { current: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <PillTrack
      as="div"
      role="group"
      aria-label={label}
      className={cn("flex h-10 items-center gap-0.5 rounded-full border border-line p-1 transition-opacity", pending && "opacity-60")}
    >
      <Globe className="mx-1.5 hidden h-4 w-4 text-muted sm:block" aria-hidden />
      {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          data-pill
          aria-pressed={current === l}
          onClick={() =>
            start(async () => {
              await setLocale(l);
              router.refresh();
            })
          }
          className="pill-item h-8 rounded-full px-2.5 text-xs font-medium"
        >
          {LABELS[l]}
        </button>
      ))}
    </PillTrack>
  );
}
