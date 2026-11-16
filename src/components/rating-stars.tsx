import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({ value, className, size = 14 }: { value: number; className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-line-strong" style={{ width: size, height: size }} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="fill-accent text-accent" style={{ width: size, height: size }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
