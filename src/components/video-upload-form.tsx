"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { deletePortfolioItem, startVideoUpload } from "@/actions/portfolio";
import { Field } from "@/components/page-bits";
import { VIDEO } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/video";

type Labels = {
  title: string;
  category: string;
  file: string;
  fileHint: string;
  formatVertical: string;
  formatHorizontal: string;
  upload: string;
  checking: string;
  uploading: string;
  cancel: string;
  uploaded: string;
  keepOpen: string;
  retrying: string;
  errSize: string;
  errDuration: string;
  errType: string;
  errFailed: string;
};

type Phase = "idle" | "checking" | "uploading";

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv)$/i;

type Meta = { duration: number | null; width: number; height: number };

/**
 * Brauzerning o'zida video davomiyligi va o'lchamini o'qish (yuklashdan oldin).
 * O'qiy olmasa (masalan ba'zi brauzerlarda HEVC) — null; server baribir ffprobe bilan tekshiradi.
 */
function readMeta(file: File): Promise<Meta | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;
    const done = (x: Meta | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      v.load();
      resolve(x);
    };
    const timer = setTimeout(() => done(null), 8000);
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () =>
      done({ duration: Number.isFinite(v.duration) ? v.duration : null, width: v.videoWidth, height: v.videoHeight });
    v.onerror = () => done(null);
    v.src = url;
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class FatalUpload extends Error {}

/**
 * Faylni bo'laklab yuboradi. Internet uzilsa — shu bo'lakni 6 martagacha qayta yuboradi (1, 2, 4, 8… soniya kutib),
 * server boshqa joyni aytsa (409) — o'sha joydan davom etadi.
 */
async function uploadChunks(id: string, file: File, signal: AbortSignal, onProgress: (sent: number) => void, onRetry: (on: boolean) => void) {
  let offset = 0;
  let failures = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + VIDEO.chunkBytes, file.size));
    let res: Response | null = null;
    try {
      res = await fetch(`/api/portfolio/videos/${id}?offset=${offset}`, {
        method: "PUT",
        body: chunk,
        headers: { "Content-Type": "application/octet-stream" },
        signal,
      });
    } catch (e) {
      if (signal.aborted) throw e;
    }
    if (res && (res.ok || res.status === 409)) {
      const j = (await res.json().catch(() => ({}))) as { received?: number; done?: boolean };
      if (typeof j.received !== "number") throw new FatalUpload("");
      offset = j.done ? file.size : j.received;
      onProgress(offset);
      if (res.ok) {
        failures = 0;
        onRetry(false);
      }
      continue;
    }
    if (res && res.status !== 429 && res.status < 500) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      throw new FatalUpload(j.message || "");
    }
    // Tarmoq xatosi, 5xx yoki 429 — kutib, qayta urinamiz
    if (++failures > 6) throw new FatalUpload("");
    onRetry(true);
    await sleep(Math.min(1000 * 2 ** (failures - 1), 15_000));
  }
}

export function VideoUploadForm({
  labels,
  categories,
  defaultCategory,
}: {
  labels: Labels;
  categories: { key: string; label: string }[];
  defaultCategory: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);

  /** Fayl tanlanganda: formatni (vertikal/gorizontal) ko'rsatish, yo'nalishni moslash, uzunlikni darhol tekshirish */
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(null);
    setMeta(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > VIDEO.maxUploadBytes) return setMessage({ ok: false, text: labels.errSize });
    const m = await readMeta(file);
    if (!m) return;
    setMeta(m);
    if (m.duration !== null && m.duration > VIDEO.maxSeconds + 0.5) setMessage({ ok: false, text: labels.errDuration });
    const sel = categoryRef.current;
    if (sel && m.width && m.height) {
      if (m.height > m.width * 1.1) sel.value = "reels";
      else if (sel.value === "reels") sel.value = "youtube";
    }
  }

  // Yuklash paytida sahifani yopmoqchi bo'lsa — ogohlantirish
  useEffect(() => {
    if (phase !== "uploading") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase !== "idle") return;
    const fd = new FormData(e.currentTarget);
    const file = fd.get("video");
    const title = String(fd.get("title") ?? "").trim();
    const category = String(fd.get("category") ?? "");
    setMessage(null);
    if (!(file instanceof File) || file.size === 0) return;
    if (!file.type.startsWith("video/") && !VIDEO_EXT.test(file.name)) return setMessage({ ok: false, text: labels.errType });
    if (file.size > VIDEO.maxUploadBytes) return setMessage({ ok: false, text: labels.errSize });

    setPhase("checking");
    const duration = (await readMeta(file))?.duration ?? null;
    if (duration !== null && duration > VIDEO.maxSeconds + 0.5) {
      setPhase("idle");
      return setMessage({ ok: false, text: labels.errDuration });
    }

    let id: string | null = null;
    try {
      const start = await startVideoUpload({ title, category, size: file.size, duration });
      if (!start.ok) {
        setPhase("idle");
        return setMessage({ ok: false, text: start.message || labels.errFailed });
      }
      id = start.id;
      setPhase("uploading");
      setProgress(0);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      await uploadChunks(id, file, ctrl.signal, (sent) => setProgress(Math.round((sent / file.size) * 100)), setRetrying);
      formRef.current?.reset();
      setMeta(null);
      setMessage({ ok: true, text: labels.uploaded });
      router.refresh();
    } catch (err) {
      const cancelled = abortRef.current?.signal.aborted;
      // Chala qolgan yozuvni o'chiramiz — limitdan joy egallab turmasin
      if (id) await deletePortfolioItem(id, null, new FormData()).catch(() => {});
      if (!cancelled) setMessage({ ok: false, text: (err instanceof FatalUpload && err.message) || labels.errFailed });
      router.refresh();
    } finally {
      abortRef.current = null;
      setRetrying(false);
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <Field label={labels.title}>
        <input name="title" required minLength={2} maxLength={100} disabled={busy} className="input" />
      </Field>
      <Field label={labels.category}>
        <select ref={categoryRef} name="category" className="input" defaultValue={defaultCategory} disabled={busy}>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={labels.file} hint={labels.fileHint}>
        <input
          name="video"
          type="file"
          required
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*,.mp4,.mov,.m4v,.webm,.mkv"
          disabled={busy}
          onChange={onFileChange}
          className="input"
        />
      </Field>
      {meta && meta.width > 0 && meta.height > 0 && (
        <p className="-mt-2 flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className={cn("inline-block shrink-0 rounded-[3px] border-2 border-fg", meta.height > meta.width * 1.1 ? "h-5 w-3" : "h-3 w-5")}
          />
          {meta.height > meta.width * 1.1 ? labels.formatVertical : labels.formatHorizontal}
          {meta.duration !== null && <span className="text-muted tabular-nums">· {formatDuration(meta.duration)}</span>}
        </p>
      )}

      {phase === "uploading" ? (
        <div className="space-y-3" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {retrying ? labels.retrying : labels.uploading.replace("{p}", String(progress))}
            </span>
            <button type="button" onClick={() => abortRef.current?.abort()} className="btn btn-ghost btn-sm">
              <X className="h-4 w-4" /> {labels.cancel}
            </button>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-card-2">
            <div className="h-full rounded-full bg-fg transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted">{labels.keepOpen}</p>
        </div>
      ) : (
        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {phase === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {phase === "checking" ? labels.checking : labels.upload}
        </button>
      )}

      {message && (
        <p
          role="status"
          className={cn("fade-up rounded-xl px-3 py-2 text-sm", message.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
