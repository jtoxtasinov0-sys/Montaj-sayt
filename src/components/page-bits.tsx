import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Stars } from "@/components/stars";
import { cn } from "@/lib/utils";

/** Ichki sahifalar sarlavhasi — kichik planeta yoyi bilan */
export function PageHero({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <section className="dark relative isolate mx-2 mt-2 overflow-hidden rounded-[2rem] border border-line bg-[#05050f] text-fg sm:mx-3">
      <Stars className="absolute inset-0 -z-10 opacity-60" />
      <div
        aria-hidden
        className="absolute -top-[480px] left-1/2 -z-10 aspect-square w-[900px] -translate-x-1/2 rounded-full shadow-[0_30px_80px_-10px_rgba(255,79,216,0.45),0_60px_160px_10px_rgba(61,76,228,0.4),inset_0_-30px_60px_-20px_rgba(255,110,225,0.5)] ring-1 ring-[#ffaa82]/30"
      />
      <div className="container-x pt-32 pb-12 sm:pb-16">
        <h1 className="h-hero fade-up text-[clamp(2.4rem,6vw,4.6rem)] text-balance">{title}</h1>
        {subtitle && <p className="fade-up mt-4 max-w-2xl text-muted [animation-delay:.1s]">{subtitle}</p>}
        {children && <div className="fade-up mt-8 [animation-delay:.2s]">{children}</div>}
      </div>
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

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone: Record<string, string> = {
    OPEN: "bg-primary/15 text-primary-2 border-primary/30",
    PENDING: "bg-warn/15 text-warn border-warn/30",
    IN_PROGRESS: "bg-primary/15 text-primary-2 border-primary/30",
    DELIVERED: "bg-accent/15 text-accent border-accent/30",
    COMPLETED: "bg-success/15 text-success border-success/30",
    CANCELLED: "bg-danger/10 text-danger border-danger/30",
    APPROVED: "bg-success/15 text-success border-success/30",
    REJECTED: "bg-danger/10 text-danger border-danger/30",
  };
  return <span className={cn("chip", tone[status])}>{label}</span>;
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
