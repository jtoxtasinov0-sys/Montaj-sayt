import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BackButton } from "./back-button";

export type BackLink = { href: string; label: string };

/** Ichki sahifalar sarlavhasi — katta matn va pastda chiziladigan ingichka chiziq. `back` — tepada "Orqaga" tugmasi */
export function PageHero({ title, subtitle, back, children }: { title: string; subtitle?: string; back?: BackLink; children?: React.ReactNode }) {
  return (
    <section className={cn("container-x", back ? "pt-24 sm:pt-28" : "pt-32 sm:pt-36")}>
      {back && <BackButton fallback={back.href} label={back.label} className="fade-up mb-6 sm:mb-8" />}
      <h1 className="h-hero fade-up text-[clamp(2.4rem,6vw,4.6rem)] text-balance">{title}</h1>
      {subtitle && <p className="fade-up mt-4 max-w-2xl text-muted [animation-delay:.08s]">{subtitle}</p>}
      {children && <div className="fade-up mt-8 [animation-delay:.16s]">{children}</div>}
      <span data-reveal="line" className="mt-10 block h-px bg-line-strong sm:mt-12" aria-hidden />
    </section>
  );
}

export function Pagination({ page, pages, href, labels }: { page: number; pages: number; href: (p: number) => string; labels: { prev: string; next: string } }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="pagination">
      <Link
        aria-disabled={page <= 1}
        href={href(Math.max(1, page - 1))}
        className={cn("btn btn-ghost btn-sm", page <= 1 && "pointer-events-none opacity-40")}
      >
        <ChevronLeft className="h-4 w-4" /> {labels.prev}
      </Link>
      <span className="px-3 text-sm text-muted">
        {page} / {pages}
      </span>
      <Link
        aria-disabled={page >= pages}
        href={href(Math.min(pages, page + 1))}
        className={cn("btn btn-ghost btn-sm", page >= pages && "pointer-events-none opacity-40")}
      >
        {labels.next} <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}

export function Empty({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("card grid place-items-center p-10 text-center text-sm text-muted", className)}>{children}</div>;
}

export function StatusBadge({ status, label, className }: { status: string; label: string; className?: string }) {
  const tone: Record<string, string> = {
    // Oq-qora: faol holatlar — ingichka ramka, yakunlangan — to'liq bo'yalgan, bekor — qizil
    OPEN: "text-fg border-line-strong",
    PENDING: "text-fg border-dashed border-line-strong",
    IN_PROGRESS: "text-fg border-fg",
    DELIVERED: "text-fg border-fg",
    COMPLETED: "bg-fg text-bg border-transparent",
    CANCELLED: "text-danger border-danger/40",
    APPROVED: "bg-fg text-bg border-transparent",
    REJECTED: "text-danger border-danger/40",
  };
  return <span className={cn("chip", tone[status], className)}>{label}</span>;
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
