"use client";

import { useEffect, useRef, useState } from "react";
import { formatUzs } from "@/lib/utils";
import { CopyButton } from "./form";

/** Tanlangan rejaning aniq summasini (kod bilan) ko'rsatadi — reja almashtirilsa o'zi yangilanadi */
export function PayAmount({
  amounts,
  initial,
  labels,
}: {
  amounts: Record<string, number>;
  initial: string;
  labels: { title: string; uzs: string; copy: string; copied: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [planId, setPlanId] = useState(initial);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.name === "planId") setPlanId(t.value);
    };
    const onReset = () => setPlanId(initial);
    form.addEventListener("change", onChange);
    form.addEventListener("reset", onReset);
    return () => {
      form.removeEventListener("change", onChange);
      form.removeEventListener("reset", onReset);
    };
  }, [initial]);

  const amount = amounts[planId];
  if (amount === undefined) return <div ref={ref} />;
  return (
    <div ref={ref} className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-2/40 bg-primary/10 px-4 py-3">
      <div>
        <p className="text-xs text-muted">{labels.title}</p>
        <p className="font-mono text-2xl tracking-tight">
          {formatUzs(amount)} <span className="font-sans text-sm text-muted">{labels.uzs}</span>
        </p>
      </div>
      <CopyButton text={String(amount)} label={labels.copy} done={labels.copied} />
    </div>
  );
}
