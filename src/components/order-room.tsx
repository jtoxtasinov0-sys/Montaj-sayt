"use client";

import { Download, Eye, FileText, Loader2, Lock, Paperclip, Send, SendHorizontal, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { connectTelegram, deleteOrderFile, sendRoomMessage, startOrderFileUpload, telegramResend } from "@/actions/room";
import { fmt } from "@/lib/i18n/fmt";
import type { RoomFile, RoomMessage } from "@/lib/order-room";
import { isStaleDeployError, reloadForNewVersion } from "@/lib/stale-deploy";
import { cn, formatBytes, stableDate } from "@/lib/utils";

type Labels = {
  title: string;
  subtitle: string;
  placeholder: string;
  send: string;
  empty: string;
  masked: string;
  you: string;
  client: string;
  specialist: string;
  admin: string;
  files: string;
  materials: string;
  materialsHint: string;
  results: string;
  resultsHint: string;
  noFiles: string;
  uploadMaterial: string;
  uploadResult: string;
  uploading: string;
  uploaded: string;
  keepOpen: string;
  retrying: string;
  cancel: string;
  download: string;
  preview: string;
  deleteFile: string;
  deleteAsk: string;
  quota: string;
  limits: string;
  expires: string;
  removed: string;
  closedNote: string;
  readOnly: string;
  fileShared: string;
  sys: Record<string, string>;
  tgSend: string;
  tgSendHint: string;
  tgGet: string;
  tgSent: string;
  tgVia: string;
  other_client: string;
  other_specialist: string;
  errFileTooBig: string;
  errFailed: string;
};

type Props = {
  orderId: string;
  meId: string;
  role: "client" | "editor" | "admin";
  clientId: string;
  status: string;
  messages: RoomMessage[];
  files: RoomFile[];
  canWrite: boolean;
  canUpload: boolean;
  expiresAt: string | null;
  keepDays: number;
  limits: { maxFile: number; maxOrder: number; chunk: number; maxLength: number; pollMs: number };
  locale: string;
  labels: Labels;
  /** Telegram bot sozlanganmi (fayl va xabarni bot orqali yuborish) */
  telegram: boolean;
};

type Upload = { key: string; id: string | null; name: string; size: number; sent: number; retrying: boolean; error: string | null };

const PREVIEW = /^(video\/(mp4|webm|quicktime)|image\/(jpeg|png|webp)|audio\/(mpeg|mp4|wav))$/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
class FatalUpload extends Error {}

/**
 * Faylni bo'laklab yuboradi. Internet uzilsa — shu bo'lakni 8 martagacha qayta yuboradi (1, 2, 4… soniya kutib),
 * server boshqa joyni aytsa (409) — o'sha joydan davom etadi.
 */
async function uploadChunks(
  id: string,
  file: File,
  chunk: number,
  signal: AbortSignal,
  onProgress: (sent: number) => void,
  onRetry: (on: boolean) => void,
) {
  let offset = 0;
  let failures = 0;
  while (offset < file.size) {
    const part = file.slice(offset, Math.min(offset + chunk, file.size));
    let res: Response | null = null;
    try {
      res = await fetch(`/api/order-files/${id}?offset=${offset}`, {
        method: "PUT",
        body: part,
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
    if (++failures > 8) throw new FatalUpload("");
    onRetry(true);
    await sleep(Math.min(1000 * 2 ** (failures - 1), 20_000));
  }
}

const fileHref = (id: string, inline = false) => `/api/order-files/${id}${inline ? "?inline=1" : ""}`;

/**
 * Telegram havolasini ochish. Server javobini kutgandan keyin window.open bloklanishi mumkin, shuning uchun
 * oyna bosilgan zahoti ochiladi va havola keyin beriladi.
 */
async function openTelegram(get: () => Promise<{ ok: true; url: string } | { ok: false; message: string }>) {
  const w = window.open("", "_blank");
  const r = await get().catch(() => null);
  if (!r?.ok) {
    w?.close();
    return r;
  }
  if (w) w.location.href = r.url;
  else window.location.href = r.url;
  return r;
}

export function OrderRoom(p: Props) {
  const L = p.labels;
  const router = useRouter();
  const [messages, setMessages] = useState(p.messages);
  const [files, setFiles] = useState(p.files);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const statusRef = useRef(p.status);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const aborts = useRef(new Map<string, AbortController>());
  const lastAt = useRef(p.messages.at(-1)?.createdAt ?? null);

  // ---- yangi xabarlarni olish ----
  const poll = useCallback(async () => {
    try {
      const q = lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
      const res = await fetch(`/api/orders/${p.orderId}/room${q}`, { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { status: string; messages: RoomMessage[]; files: RoomFile[] };
      if (j.messages.length) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const fresh = j.messages.filter((m) => !seen.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        lastAt.current = j.messages.at(-1)!.createdAt;
      }
      setFiles(j.files);
      // Ikkinchi tomon holatni o'zgartirgan (qabul qildi, topshirdi…) — tugmalar yangilanishi uchun sahifani yangilaymiz
      if (j.status !== statusRef.current) {
        statusRef.current = j.status;
        router.refresh();
      }
    } catch {}
  }, [p.orderId, router]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, p.limits.pollMs);
    const onVisible = () => document.visibilityState === "visible" && void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll, p.limits.pollMs]);

  // Sahifa yangilanganda (router.refresh) server bergan holatni olamiz
  useEffect(() => {
    statusRef.current = p.status;
  }, [p.status]);

  // ---- pastga aylantirish: yangi xabar kelsa (foydalanuvchi pastda turgan bo'lsa) ----
  const nearBottom = useRef(true);
  useEffect(() => {
    const el = listRef.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // ---- yuklash paytida sahifani yopishdan ogohlantirish ----
  const busy = uploads.some((u) => !u.error && u.sent < u.size);
  useEffect(() => {
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [busy]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await sendRoomMessage(p.orderId, body);
      if (r?.ok) {
        setText("");
        nearBottom.current = true;
        await poll();
      } else setError(r?.message || L.errFailed);
    } catch (e) {
      if (isStaleDeployError(e) && reloadForNewVersion()) return;
      setError(L.errFailed);
    } finally {
      setSending(false);
    }
  }

  const patch = (key: string, x: Partial<Upload>) => setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...x } : u)));

  async function uploadOne(file: File) {
    const key = `${file.name}:${file.size}:${Math.random()}`;
    const ctrl = new AbortController();
    aborts.current.set(key, ctrl);
    setUploads((list) => [...list, { key, id: null, name: file.name, size: file.size, sent: 0, retrying: false, error: null }]);
    if (file.size > p.limits.maxFile) {
      patch(key, { error: fmt(L.errFileTooBig, { max: formatBytes(p.limits.maxFile) }) });
      return;
    }
    let id: string | null = null;
    try {
      const r = await startOrderFileUpload(p.orderId, { name: file.name, size: file.size, mime: file.type });
      if (!r.ok) {
        patch(key, { error: r.message || L.errFailed });
        return;
      }
      id = r.id;
      patch(key, { id });
      await uploadChunks(
        id,
        file,
        p.limits.chunk,
        ctrl.signal,
        (sent) => patch(key, { sent }),
        (retrying) => patch(key, { retrying }),
      );
      patch(key, { sent: file.size, retrying: false });
      nearBottom.current = true;
      await poll();
      // Tayyor bo'lgan yuklash qatori biroz turib yo'qoladi (fayl ro'yxatda va chatda chiqdi)
      setTimeout(() => setUploads((list) => list.filter((u) => u.key !== key)), 2500);
    } catch (err) {
      if (!id && isStaleDeployError(err) && reloadForNewVersion()) return;
      if (id) await deleteOrderFile(id).catch(() => {});
      if (ctrl.signal.aborted) setUploads((list) => list.filter((u) => u.key !== key));
      else patch(key, { error: (err instanceof FatalUpload && err.message) || L.errFailed, retrying: false });
    } finally {
      aborts.current.delete(key);
    }
  }

  async function onPick(list: FileList | null) {
    if (!list?.length) return;
    const picked = Array.from(list);
    if (fileInput.current) fileInput.current.value = "";
    for (const f of picked) await uploadOne(f);
  }

  async function sendViaTelegram() {
    setError(null);
    const r = await openTelegram(() => connectTelegram(p.orderId));
    if (r && !r.ok) setError(r.message || L.errFailed);
  }

  async function getInTelegram(id: string) {
    setError(null);
    const r = await openTelegram(() => telegramResend(id));
    if (r && !r.ok) setError(r.message || L.errFailed);
    else if (r?.ok) {
      setNotice(L.tgSent);
      setTimeout(() => setNotice(null), 4000);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(L.deleteAsk)) return;
    const r = await deleteOrderFile(id).catch(() => null);
    if (r?.ok) await poll();
  }

  const ready = files.filter((f) => f.status === "ready");
  // Telegram orqali yuborilganlar diskimizni egallamaydi — limitga kirmaydi
  const used = ready.filter((f) => f.storage === "disk").reduce((s, f) => s + f.size, 0);
  const groups = [
    { key: "material", title: L.materials, hint: L.materialsHint, items: files.filter((f) => f.purpose === "material") },
    { key: "result", title: L.results, hint: L.resultsHint, items: files.filter((f) => f.purpose === "result") },
  ];
  const who = (m: RoomMessage) =>
    m.authorId === p.meId ? L.you : m.authorId === p.clientId ? `${m.authorName} · ${L.client}` : `${m.authorName} · ${L.specialist}`;

  return (
    <section id="room" className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div className="min-w-0">
          <h2 className="text-lg font-medium">{L.title}</h2>
          <p className="mt-1 max-w-xl text-xs text-muted">{L.subtitle}</p>
        </div>
        <span className="chip shrink-0">
          <Lock className="h-3 w-3" /> {p.role === "admin" ? L.admin : L.files}: {ready.length}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px]">
        {/* ---- chat ---- */}
        <div className="flex min-w-0 flex-col">
          <div
            ref={listRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            className="h-[26rem] space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5"
            aria-live="polite"
          >
            {messages.length === 0 && <p className="grid h-full place-items-center px-6 text-center text-sm text-muted">{L.empty}</p>}
            {messages.map((m) => {
              if (!m.authorId && m.body.startsWith("sys:")) {
                return (
                  <p key={m.id} className="mx-auto w-fit max-w-[90%] rounded-full bg-card-2 px-3 py-1.5 text-center text-xs text-muted">
                    {L.sys[m.body.slice(4)] ?? m.body.slice(4)} · {stableDate(m.createdAt, true)}
                  </p>
                );
              }
              const mine = m.authorId === p.meId;
              return (
                <div key={m.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
                  <span className="px-1 text-[0.7rem] text-muted">
                    {who(m)} · {stableDate(m.createdAt, true)}
                  </span>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line",
                      mine ? "rounded-br-md bg-fg text-bg" : "rounded-bl-md bg-card-2",
                    )}
                  >
                    {m.file ? <FileChip f={m.file} L={L} light={mine} onTelegram={getInTelegram} /> : m.body}
                  </div>
                  {m.masked && (
                    <span className="inline-flex items-center gap-1 px-1 text-[0.7rem] text-muted">
                      <Lock className="h-3 w-3" /> {L.masked}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {uploads.length > 0 && (
            <div className="space-y-2 border-t border-line px-4 py-3">
              {uploads.map((u) => {
                const pct = u.size ? Math.floor((u.sent / u.size) * 100) : 0;
                const done = !u.error && u.sent >= u.size;
                return (
                  <div key={u.key} className="text-xs">
                    <div className="flex items-center gap-2">
                      {done ? <Paperclip className="h-3.5 w-3.5" /> : u.error ? <X className="h-3.5 w-3.5 text-danger" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span className="min-w-0 flex-1 truncate">{u.name}</span>
                      <span className={cn("shrink-0", u.error ? "text-danger" : "text-muted")}>
                        {u.error ? "" : done ? L.uploaded : u.retrying ? L.retrying : fmt(L.uploading, { p: pct })}
                      </span>
                      {!done && !u.error && (
                        <button type="button" onClick={() => aborts.current.get(u.key)?.abort()} className="text-muted hover:text-fg" aria-label={L.cancel}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {u.error && (
                        <button type="button" onClick={() => setUploads((l) => l.filter((x) => x.key !== u.key))} className="text-muted hover:text-fg" aria-label={L.cancel}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {u.error ? (
                      <p className="mt-1 text-danger">{u.error}</p>
                    ) : (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-card-2">
                        <div className="h-full bg-fg transition-[width]" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
              {busy && <p className="text-[0.7rem] text-muted">{L.keepOpen}</p>}
            </div>
          )}

          {p.canWrite && p.role !== "admin" ? (
            <form
              className="flex items-end gap-2 border-t border-line p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              {p.canUpload && (
                <>
                  <input ref={fileInput} type="file" multiple className="sr-only" onChange={(e) => void onPick(e.target.files)} tabIndex={-1} />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="btn btn-ghost btn-sm h-11 w-11 shrink-0 !px-0"
                    title={p.role === "editor" ? L.uploadResult : L.uploadMaterial}
                    aria-label={p.role === "editor" ? L.uploadResult : L.uploadMaterial}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </>
              )}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={Math.min(5, Math.max(1, text.split("\n").length))}
                maxLength={p.limits.maxLength}
                placeholder={L.placeholder}
                aria-label={L.placeholder}
                className="input min-h-11 flex-1 resize-none py-2.5"
              />
              <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary btn-sm h-11 w-11 shrink-0 !px-0" aria-label={L.send} title={L.send}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              </button>
            </form>
          ) : (
            p.role !== "admin" && <p className="border-t border-line p-4 text-center text-xs text-muted">{L.readOnly}</p>
          )}
          {error && <p className="mx-3 mb-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          {notice && <p className="mx-3 mb-3 rounded-xl bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>}
        </div>

        {/* ---- fayllar ---- */}
        <aside className="space-y-5 border-t border-line p-5 lg:border-t-0 lg:border-l">
          {p.telegram && p.canUpload && p.role !== "admin" && (
            <div className="rounded-2xl border border-line p-3.5">
              <button type="button" onClick={() => void sendViaTelegram()} className="btn btn-primary btn-sm w-full">
                <Send className="h-4 w-4" /> {L.tgSend}
              </button>
              <p className="mt-2 text-[0.7rem] leading-snug text-muted">
                {fmt(L.tgSendHint, { other: p.role === "client" ? L.other_specialist : L.other_client })}
              </p>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.key}>
              <p className="text-sm font-medium">{g.title}</p>
              <p className="text-[0.7rem] text-muted">{g.hint}</p>
              {g.items.length === 0 ? (
                <p className="mt-2 text-xs text-muted">{L.noFiles}</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {g.items.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-xs font-medium", f.status !== "ready" && "text-muted line-through")} title={f.name}>
                          {f.name}
                        </p>
                        <p className="text-[0.7rem] text-muted">
                          {f.status === "ready"
                            ? `${f.size ? `${formatBytes(f.size)} · ` : ""}${stableDate(f.createdAt)}${f.storage === "telegram" ? ` · ${L.tgVia}` : ""}`
                            : L.removed}
                        </p>
                      </div>
                      {f.status === "ready" && f.storage === "telegram" && p.role !== "admin" && (
                        <button type="button" onClick={() => void getInTelegram(f.id)} className="text-muted hover:text-fg" title={L.tgGet} aria-label={L.tgGet}>
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      {f.status === "ready" && f.storage === "disk" && (
                        <>
                          {PREVIEW.test(f.mime) && (
                            <a href={fileHref(f.id, true)} target="_blank" rel="noopener" className="text-muted hover:text-fg" title={L.preview} aria-label={L.preview}>
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          <a href={fileHref(f.id)} className="text-muted hover:text-fg" title={L.download} aria-label={L.download}>
                            <Download className="h-4 w-4" />
                          </a>
                          {f.uploaderId === p.meId && (
                            <button type="button" onClick={() => void remove(f.id)} className="text-muted hover:text-danger" title={L.deleteFile} aria-label={L.deleteFile}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="space-y-2 border-t border-line pt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-card-2">
              <div className="h-full bg-fg" style={{ width: `${Math.min(100, (used / p.limits.maxOrder) * 100)}%` }} />
            </div>
            <p className="text-[0.7rem] text-muted">{fmt(L.quota, { used: formatBytes(used), max: formatBytes(p.limits.maxOrder) })}</p>
            {p.canUpload && <p className="text-[0.7rem] text-muted">{fmt(L.limits, { max: formatBytes(p.limits.maxFile) })}</p>}
            {p.expiresAt && (
              <p className="rounded-xl bg-card-2 px-3 py-2 text-[0.7rem]">
                {fmt(L.closedNote, { days: p.keepDays })} {fmt(L.expires, { date: stableDate(p.expiresAt) })}
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function FileChip({ f, L, light, onTelegram }: { f: RoomFile; L: Labels; light: boolean; onTelegram: (id: string) => void }) {
  if (f.status !== "ready") {
    return (
      <span className="inline-flex items-center gap-2 opacity-70">
        <Paperclip className="h-4 w-4" /> <span className="line-through">{f.name}</span> · {L.removed}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-3">
      <Paperclip className="h-4 w-4 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate font-medium">{f.name}</span>
        <span className={cn("text-xs", light ? "opacity-70" : "text-muted")}>
          {f.storage === "telegram" ? L.tgVia : L.fileShared}
          {f.size ? ` · ${formatBytes(f.size)}` : ""}
        </span>
      </span>
      {f.storage === "telegram" ? (
        <button
          type="button"
          onClick={() => onTelegram(f.id)}
          className={cn("ml-1 shrink-0 rounded-full p-1.5 transition", light ? "hover:bg-bg/15" : "hover:bg-bg")}
          aria-label={L.tgGet}
          title={L.tgGet}
        >
          <Send className="h-4 w-4" />
        </button>
      ) : (
        <a
          href={fileHref(f.id)}
          className={cn("ml-1 shrink-0 rounded-full p-1.5 transition", light ? "hover:bg-bg/15" : "hover:bg-bg")}
          aria-label={L.download}
          title={L.download}
        >
          <Download className="h-4 w-4" />
        </a>
      )}
    </span>
  );
}
