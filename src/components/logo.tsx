import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Belgi: "play" uchburchagi + montaj kesimi + yozuv nuqtasi */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="1" y2="1">
          {/* Mavzu rangidan: qorong'ida ko'k, yorug'da binafsha */}
          <stop offset="0" style={{ stopColor: "color-mix(in oklab, var(--primary-2) 80%, white)" }} />
          <stop offset="1" style={{ stopColor: "var(--primary)" }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lm-g)" />
      <path d="M12 9.2 23.6 16 12 22.8Z" fill="#fff" />
      <path d="M8.5 21.5 23 10.5" stroke="url(#lm-g)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="25" cy="7" r="2.3" fill="#ff4fd8" />
    </svg>
  );
}

/** Nomni ikki qismga bo'ladi: birinchi so'z ingichka, qolgani qalin ("Montaj" + " Club") */
function splitName(name: string): [string, string] {
  const i = name.indexOf(" ");
  if (i > 0) return [name.slice(0, i), name.slice(i)];
  if (name.startsWith("Montaj") && name.length > 6) return ["Montaj", name.slice(6)];
  return [name, ""];
}

/** Brend yozuvi — SITE_NAME dan olinadi */
export function Wordmark({ className }: { className?: string }) {
  const [a, b] = splitName(SITE_NAME);
  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span className="font-light">{a}</span>
      <span className="font-semibold">{b}</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label={SITE_NAME}>
      <LogoMark className="transition-transform duration-500 group-hover:rotate-[-8deg]" />
      <Wordmark className="text-[1.2rem] tracking-[-0.04em]" />
    </Link>
  );
}
