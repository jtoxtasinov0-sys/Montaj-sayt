import { BadgeCheck, Clock, Flame, MapPin } from "lucide-react";
import Link from "next/link";
import type { EditorCardData } from "@/lib/data";
import { fmt, type Dict } from "@/lib/i18n";
import { isTopRated } from "@/lib/ranking-shared";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { RatingStars } from "./rating-stars";

export function EditorCard({ e, d, className }: { e: EditorCardData; d: Dict; className?: string }) {
  const boosted = e.boostWeight > 0 && e.boostUntil && new Date(e.boostUntil) > new Date();
  const onTimePct = e.completedOrders ? Math.round((e.onTimeOrders / e.completedOrders) * 100) : null;
  const top = isTopRated(e);
  return (
    <Link
      href={`/editors/${e.slug}`}
      data-spotlight
      className={cn(
        "card group flex h-full flex-col gap-4 p-5 transition duration-300 hover:-translate-y-1 hover:border-line-strong",
        boosted && "ring-glow",
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="relative">
          <Avatar name={e.displayName} avatarKey={e.avatarKey} image={e.userImage} size={56} />
          <span
            className={cn(
              "absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-bg",
              e.isAvailable ? "bg-success" : "bg-muted",
            )}
            title={e.isAvailable ? d.editors.available : d.editors.busy}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[1.05rem] font-medium tracking-tight">{e.displayName}</h3>
            {e.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary-2" aria-label={d.editors.verified} />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[0.82rem] leading-snug text-muted">{e.headline}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* TOP belgisi chiplar qatorida — ism uchun to'liq joy qoladi */}
        {boosted && (
          <span className="chip chip-accent">
            <Flame className="h-3 w-3" /> {d.editors.topBadge}
          </span>
        )}
        <span className="chip">{d.levels[e.level]}</span>
        {top && <span className="chip chip-primary">{d.editors.topRated}</span>}
        {e.categories.slice(0, 2).map((c) => (
          <span key={c} className="chip">
            {d.categories[c] ?? c}
          </span>
        ))}
        {e.city && (
          <span className="chip">
            <MapPin className="h-3 w-3" />
            {e.city}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
        <div className="space-y-1 text-xs text-muted">
          {e.ratingCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <RatingStars value={e.ratingAvg} size={13} />
              <span className="font-medium text-fg">{e.ratingAvg.toFixed(1)}</span>
              <span>({e.ratingCount})</span>
            </div>
          ) : (
            <span className="chip chip-success">{d.editors.newcomer}</span>
          )}
          <div className="flex items-center gap-3">
            <span>{fmt(d.editors.jobsDone, { n: e.completedOrders })}</span>
            {onTimePct !== null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {fmt(d.editors.onTime, { p: onTimePct })}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-light tracking-tight">${e.priceFrom}</div>
          <div className="text-[0.7rem] text-muted">{d.editors.from}</div>
        </div>
      </div>
    </Link>
  );
}
