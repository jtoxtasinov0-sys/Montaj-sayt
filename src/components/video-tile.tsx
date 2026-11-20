"use client";

import { ExternalLink, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { uploadUrl } from "@/lib/uploads-url";
import { cn } from "@/lib/utils";
import { embedSrc, videoThumb } from "@/lib/video";

type Item = { id: string; title: string; url: string; provider: string; embedId: string | null; coverKey: string | null };

const PROVIDER_LABEL: Record<string, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  instagram: "Instagram",
  telegram: "Telegram",
  drive: "Google Drive",
  tiktok: "TikTok",
  other: "Link",
};

/** Portfolio videosi: bosilganda YouTube/Vimeo shu yerda ochiladi, boshqalari — yangi oynada */
export function VideoTile({ item, categoryLabel, className }: { item: Item; categoryLabel?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const cover = uploadUrl(item.coverKey) ?? videoThumb(item.provider, item.embedId);
  const src = embedSrc(item.provider, item.embedId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const inner = (
    <>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-card-2">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute top-3 left-3 chip border-white/20 bg-black/40 text-white backdrop-blur">
          {PROVIDER_LABEL[item.provider] ?? "Link"}
        </span>
        <span className="absolute inset-0 m-auto grid h-14 w-14 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition duration-300 group-hover:scale-110 group-hover:bg-primary">
          {src ? <Play className="ml-0.5 h-6 w-6 fill-white" /> : <ExternalLink className="h-5 w-5" />}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 px-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        {categoryLabel && <span className="shrink-0 text-xs text-muted">{categoryLabel}</span>}
      </div>
    </>
  );

  return (
    <>
      {src ? (
        <button type="button" onClick={() => setOpen(true)} className={cn("group block w-full text-left", className)}>
          {inner}
        </button>
      ) : (
        <a href={item.url} target="_blank" rel="noopener noreferrer nofollow ugc" className={cn("group block", className)}>
          {inner}
        </a>
      )}
      {open && src && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={item.title}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/85 p-4 backdrop-blur-sm fade-up"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute top-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={src}
              title={item.title}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      )}
    </>
  );
}
