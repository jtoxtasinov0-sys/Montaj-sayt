import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Belgi: "play" uchburchagi + montaj kesimi + yozuv nuqtasi */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7d86ff" />
          <stop offset="1" stopColor="#3d4ce4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lm-g)" />
      <path d="M12 9.2 23.6 16 12 22.8Z" fill="#fff" />
      <path d="M8.5 21.5 23 10.5" stroke="url(#lm-g)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="25" cy="7" r="2.3" fill="#ff8a5c" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  const [a, b] = SITE_NAME.startsWith("Montaj") ? ["Montaj", SITE_NAME.slice(6)] : [SITE_NAME, ""];
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label={SITE_NAME}>
      <LogoMark className="transition-transform duration-500 group-hover:rotate-[-8deg]" />
      <span className="text-[1.2rem] tracking-[-0.04em]">
        <span className="font-light">{a}</span>
        <span className="font-semibold">{b}</span>
      </span>
    </Link>
  );
}
