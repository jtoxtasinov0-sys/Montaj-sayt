"use client";

import { Camera, ImagePlus, Loader2, Minus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { updateAvatar } from "@/actions/profile";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

const VIEW = 288; // kesish oynasi, px (320px telefonga ham sig'adi)
const OUT = 512; // saqlanadigan rasm o'lchami — serverdagi avatars MAX_SIDE bilan bir xil
const MAX_ZOOM = 4;

export type AvatarEditorLabels = {
  change: string;
  title: string;
  hint: string;
  zoom: string;
  other: string;
  save: string;
  close: string;
  badType: string;
  error: string;
};

/**
 * Bosiladigan profil rasmi: rasm tanlash → doira ichida surish/kattalashtirish → saqlash.
 * Kesish brauzerda bajariladi (canvas), serverga faqat tayyor 512×512 rasm boradi.
 */
export function AvatarEditor({
  name,
  avatarKey,
  image,
  size,
  labels,
}: {
  name: string;
  avatarKey?: string | null;
  image?: string | null;
  size: number;
  labels: AvatarEditorLabels;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  const setObjectUrl = (next: string | null) =>
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next;
    });

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={labels.change}
        title={labels.change}
        className="group relative shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
      >
        <Avatar name={name} avatarKey={avatarKey} image={image} size={size} />
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="h-5 w-5" />
        </span>
        <span className="absolute -right-0.5 -bottom-0.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-white ring-2 ring-bg">
          <Camera className="h-3.5 w-3.5" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // o'sha faylni qayta tanlash ham ishlasin
          if (f) setObjectUrl(URL.createObjectURL(f));
        }}
      />
      {src &&
        createPortal(
          <CropDialog
            key={src}
            src={src}
            labels={labels}
            onClose={() => setObjectUrl(null)}
            onPickOther={(f) => setObjectUrl(URL.createObjectURL(f))}
          />,
          document.body,
        )}
    </>
  );
}

type View = { z: number; x: number; y: number };

function CropDialog({
  src,
  labels,
  onClose,
  onPickOther,
}: {
  src: string;
  labels: AvatarEditorLabels;
  onClose: () => void;
  onPickOther: (f: File) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // Modal ochiqligida sahifaning qolgan qismi "inert" — shuning uchun dialog ichida alohida input
  const otherRef = useRef<HTMLInputElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; z: number } | null>(null);

  // z = 1 da rasmning qisqa tomoni doirani to'liq qoplaydi
  const base = nat ? VIEW / Math.min(nat.w, nat.h) : 1;

  /** Rasm doiradan chiqib ketmasin: doira ichida bo'sh joy qolmaydi */
  const clamp = useCallback(
    (v: View): View => {
      if (!nat) return v;
      const s = base * v.z;
      const mx = Math.max(0, (nat.w * s - VIEW) / 2);
      const my = Math.max(0, (nat.h * s - VIEW) / 2);
      return { z: v.z, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
    },
    [nat, base],
  );

  /** Markazdagi nuqtani joyida qoldirib kattalashtirish */
  const zoomTo = useCallback(
    (next: (z: number) => number) =>
      setView((v) => {
        const z = Math.min(MAX_ZOOM, Math.max(1, next(v.z)));
        const r = z / v.z;
        return clamp({ z, x: v.x * r, y: v.y * r });
      }),
    [clamp],
  );

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Sichqoncha g'ildiragi bilan zoom (React'ning onWheel'i passive — sahifa aylanishini to'xtatolmaydi)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomTo((z) => z * Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  };

  const save = () => {
    const img = imgRef.current;
    if (!img || !nat) return;
    setError(null);
    startTransition(async () => {
      try {
        const s = base * view.z;
        const side = VIEW / s;
        const sx = nat.w / 2 - (VIEW / 2 + view.x) / s;
        const sy = nat.h / 2 - (VIEW / 2 + view.y) / s;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = OUT;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no-canvas");
        ctx.fillStyle = "#fff"; // shaffof PNG qora bo'lib qolmasin
        ctx.fillRect(0, 0, OUT, OUT);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, side, side, 0, 0, OUT, OUT);

        // Safari canvas'dan WEBP chiqarolmaydi — unda JPEG
        let blob = await toBlob(canvas, "image/webp");
        if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
        if (!blob) throw new Error("no-blob");

        const fd = new FormData();
        fd.set("avatar", new File([blob], blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg", { type: blob.type }));
        const res = await updateAvatar(fd);
        if (res?.ok) onClose();
        else setError(res?.message ?? labels.error);
      } catch {
        setError(labels.error);
      }
    });
  };

  const s = base * view.z;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="avatar-crop-title"
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
      onClose={onClose}
      onClick={(e) => {
        // Fonga (dialog tashqarisiga) bosilsa yopiladi
        if (e.target === e.currentTarget && !pending) onClose();
      }}
      className="m-auto w-[min(calc(100vw-2rem),22rem)] max-w-none rounded-3xl border border-line bg-bg p-0 text-fg shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm"
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="avatar-crop-title" className="text-lg font-medium">
            {labels.title}
          </h2>
          <button type="button" onClick={onClose} disabled={pending} aria-label={labels.close} className="btn btn-ghost btn-sm !h-9 !w-9 !p-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={viewportRef}
          tabIndex={0}
          role="application"
          aria-label={labels.hint}
          className={cn(
            "relative mx-auto touch-none overflow-hidden rounded-2xl bg-black outline-none select-none focus-visible:ring-2 focus-visible:ring-primary-2",
            nat ? "cursor-grab active:cursor-grabbing" : "",
          )}
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size === 2) pinch.current = { dist: distance(), z: view.z };
          }}
          onPointerMove={(e) => {
            const prev = pointers.current.get(e.pointerId);
            if (!prev) return;
            const cur = { x: e.clientX, y: e.clientY };
            pointers.current.set(e.pointerId, cur);
            if (pointers.current.size === 2 && pinch.current) {
              const p = pinch.current;
              zoomTo(() => (p.z * distance()) / p.dist);
            } else if (pointers.current.size === 1) {
              setView((v) => clamp({ ...v, x: v.x + cur.x - prev.x, y: v.y + cur.y - prev.y }));
            }
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId);
            if (pointers.current.size < 2) pinch.current = null;
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId);
            if (pointers.current.size < 2) pinch.current = null;
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 40 : 10;
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            };
            if (moves[e.key]) {
              e.preventDefault();
              const [dx, dy] = moves[e.key];
              setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
            } else if (e.key === "+" || e.key === "=") zoomTo((z) => z * 1.1);
            else if (e.key === "-") zoomTo((z) => z / 1.1);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => setError(labels.badType)}
            className={cn("pointer-events-none absolute top-1/2 left-1/2 max-w-none transition-opacity", nat ? "opacity-100" : "opacity-0")}
            style={
              nat
                ? {
                    width: nat.w * s,
                    height: nat.h * s,
                    transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))`,
                  }
                : undefined
            }
          />
          {!nat && !error && <Loader2 className="absolute top-1/2 left-1/2 h-6 w-6 -translate-1/2 animate-spin text-white/70" />}
          {/* Doira tashqarisi xiralashtiriladi — saqlanadigan qism shu doira */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.6)] ring-2 ring-white/85" />
        </div>

        <p className="text-center text-xs text-muted">{labels.hint}</p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => zoomTo((z) => z / 1.2)}
            disabled={!nat || view.z <= 1}
            aria-label={`${labels.zoom} −`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-card-2 hover:text-fg disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={view.z}
            disabled={!nat}
            aria-label={labels.zoom}
            onChange={(e) => {
              const z = Number(e.target.value);
              zoomTo(() => z);
            }}
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
          />
          <button
            type="button"
            onClick={() => zoomTo((z) => z * 1.2)}
            disabled={!nat || view.z >= MAX_ZOOM}
            aria-label={`${labels.zoom} +`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-card-2 hover:text-fg disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" onClick={() => otherRef.current?.click()} disabled={pending} className="btn btn-ghost btn-sm">
            <ImagePlus className="h-4 w-4" /> {labels.other}
          </button>
          <input
            ref={otherRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onPickOther(f);
            }}
          />
          <button type="button" onClick={save} disabled={!nat || pending} className="btn btn-primary btn-sm">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {labels.save}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
}
