import { cn } from "@/lib/utils";

/**
 * 5 yulduzli baho. Ko'rinishi avvalgidek (lucide "star": kulrang kontur + ustidan baho ulushigacha to'ldirilgan),
 * lekin har bir yulduz uchun alohida 10 ta SVG o'rniga ikkita SVG: 5 yulduzli kontur qatori va uning ustida
 * baho kengligigacha kesilgan to'ldirilgan qator. Katalog va bosh sahifada baho o'nlab marta chiqadi —
 * sahifa elementlari ~25% kamayadi, server sahifani tezroq tayyorlaydi.
 */

const GAP = 2; // px, avvalgi gap-0.5
// lucide-react "star" (24×24) — faqat M va L mutlaq, qolgani nisbiy buyruqlar
const STAR = (dx: number) =>
  `M${r(11.525 + dx)} 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L${r(6.396 + dx)} 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L${r(2.16 + dx)} 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z`;
const r = (n: number) => Math.round(n * 1000) / 1000;

const rows = new Map<number, { d: string; vbW: number }>();
function row(size: number) {
  let v = rows.get(size);
  if (!v) {
    const pitch = 24 + (GAP * 24) / size; // yulduz + oraliq, viewBox birliklarida
    v = { d: [0, 1, 2, 3, 4].map((i) => STAR(i * pitch)).join(""), vbW: r(120 + (4 * GAP * 24) / size) };
    rows.set(size, v);
  }
  return v;
}

export function RatingStars({ value, className, size = 14 }: { value: number; className?: string; size?: number }) {
  const v = Math.max(0, Math.min(5, value || 0));
  const full = Math.floor(v);
  const width = 5 * size + 4 * GAP;
  const fillW = Math.min(width, full * (size + GAP) + (v - full) * size);
  const { d, vbW } = row(size);
  const svg = { viewBox: `0 0 ${vbW} 24`, width, height: size, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
  return (
    <span className={cn("inline-flex items-center", className)} aria-label={`${(value || 0).toFixed(1)} / 5`}>
      <span className="relative inline-block" style={{ width, height: size }}>
        <svg {...svg} className="absolute inset-0 text-line-strong">
          <path d={d} />
        </svg>
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: fillW }}>
          <svg {...svg} className="fill-accent text-accent">
            <path d={d} />
          </svg>
        </span>
      </span>
    </span>
  );
}
