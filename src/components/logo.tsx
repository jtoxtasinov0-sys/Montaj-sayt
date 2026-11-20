import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Belgi: "play" uchburchagi — oq-qora, mavzu rangini oladi (yorug'da qora, qorong'ida oq) */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8 text-fg", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path d="M12.5 9.6 23 16l-10.5 6.4Z" fill="var(--bg)" />
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
      <LogoMark className="transition-transform duration-500 group-hover:scale-95" />
      <Wordmark className="text-[1.2rem] tracking-[-0.04em]" />
    </Link>
  );
}
