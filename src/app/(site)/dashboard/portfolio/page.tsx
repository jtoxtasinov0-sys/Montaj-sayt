import { stat } from "node:fs/promises";
import { asc, desc, eq } from "drizzle-orm";
import { AlertTriangle, Film, Loader2, Trash2, Upload } from "lucide-react";
import { redirect } from "next/navigation";
import { addPortfolioItem, deletePortfolioItem, savePortfolioLinks, setPortfolioCover } from "@/actions/portfolio";
import { AutoRefresh } from "@/components/auto-refresh";
import { CoverButton } from "@/components/cover-button";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/page-bits";
import { VideoTile } from "@/components/video-tile";
import { VideoUploadForm } from "@/components/video-upload-form";
import { db } from "@/db";
import { portfolioItems, type PortfolioItem } from "@/db/schema";
import { getEditorProfileByUser, requireUser } from "@/lib/auth/current";
import { CATEGORY_KEYS, LIMITS, VIDEO } from "@/lib/constants";
import { fmt, getDict, type Dict } from "@/lib/i18n";
import { tmpPath } from "@/lib/uploads";
import { uploadUrl } from "@/lib/uploads-url";
import { isTelegramInvite } from "@/lib/video";

export default async function PortfolioPage() {
  const user = await requireUser("/dashboard/portfolio");
  const editor = await getEditorProfileByUser(user.id);
  if (!editor) redirect("/dashboard/profile");
  const [d, items] = await Promise.all([
    getDict(),
    db.select().from(portfolioItems).where(eq(portfolioItems.editorId, editor.id)).orderBy(asc(portfolioItems.sort), desc(portfolioItems.createdAt)),
  ]);
  const f = d.portfolioForm;
  const videos = items.filter((it) => it.provider === "upload");
  const links = items.filter((it) => it.provider !== "upload");
  const activeVideos = videos.filter((v) => v.videoStatus !== "failed").length;
  const pending = videos.some((v) => v.videoStatus && ["uploading", "queued", "processing"].includes(v.videoStatus));
  const progress = await uploadProgress(videos);
  const categories = CATEGORY_KEYS.map((c) => ({ key: c, label: d.categories[c] }));
  const defaultCategory = editor.categories[0] ?? "reels";
  const tg = editor.telegramChannel;

  return (
    <div className="space-y-10">
      {pending && <AutoRefresh seconds={4} />}

      {/* 1. Saytga yuklanadigan eng zo'r 5 ta ish */}
      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="card h-fit space-y-4 p-6 lg:sticky lg:top-24">
          <div>
            <h2 className="text-lg font-medium">{f.videosTitle}</h2>
            <p className="mt-1 text-sm text-muted">
              {fmt(f.videosHint, { max: VIDEO.perEditor, sec: VIDEO.maxSeconds, mb: VIDEO.maxUploadBytes / 1048576 })}
            </p>
          </div>
          {activeVideos < VIDEO.perEditor ? (
            <VideoUploadForm
              categories={categories}
              defaultCategory={defaultCategory}
              labels={{
                title: f.title,
                category: f.category,
                file: f.videoFile,
                fileHint: f.videoFileHint,
                cover: `${f.cover} (${d.common.optional})`,
                coverHint: f.videoCoverHint,
                coverPick: f.coverPick,
                coverRemove: f.coverRemove,
                errCoverType: d.errors.uploadType,
                errCoverSize: d.errors.uploadSize,
                formatVertical: f.formatVertical,
                formatHorizontal: f.formatHorizontal,
                upload: f.upload,
                checking: f.checking,
                uploading: f.uploading,
                cancel: f.cancel,
                uploaded: f.uploaded,
                keepOpen: f.keepOpen,
                retrying: f.retrying,
                errSize: fmt(d.errors.videoSize, { mb: VIDEO.maxUploadBytes / 1048576 }),
                errDuration: fmt(d.errors.videoDuration, { sec: VIDEO.maxSeconds }),
                errType: d.errors.videoType,
                errFailed: d.errors.uploadFailed,
              }}
            />
          ) : (
            <p className="rounded-xl border border-line p-3 text-sm text-muted">{fmt(f.full, { max: VIDEO.perEditor })}</p>
          )}
          <p className="text-center text-xs text-muted">{fmt(f.count, { n: activeVideos, max: VIDEO.perEditor })}</p>
        </div>

        <div className="grid content-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((it) => (
            <div key={it.id} className="relative">
              {it.videoStatus === "ready" ? (
                <VideoTile item={it} categoryLabel={d.categories[it.category]} uniform />
              ) : (
                <StatusTile item={it} d={d} progress={progress.get(it.id)} />
              )}
              {it.videoStatus !== "failed" && <ChangeCover id={it.id} d={d} />}
              <DeleteButton id={it.id} d={d} />
            </div>
          ))}
          {Array.from({ length: Math.max(0, VIDEO.perEditor - videos.length) }, (_, i) => (
            <div key={i} aria-hidden>
              <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-line text-muted">
                <Film className="h-6 w-6 opacity-50" />
              </div>
              <p className="mt-3 px-1 text-sm text-muted">{f.emptySlot}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Havolalar va havola orqali qo'shish */}
      <section className="grid gap-6 lg:grid-cols-2">
        <ActionForm action={savePortfolioLinks} className="card h-fit space-y-4 p-6">
          <div>
            <h2 className="text-lg font-medium">{f.linksTitle}</h2>
            <p className="mt-1 text-sm text-muted">{f.linksHint}</p>
          </div>
          <Field label={f.drive} hint={f.driveHint}>
            <input
              name="driveUrl"
              type="url"
              maxLength={500}
              defaultValue={editor.driveUrl ?? ""}
              placeholder="https://drive.google.com/drive/folders/..."
              className="input"
            />
          </Field>
          <Field label={d.profileForm.telegramChannel} hint={f.telegramHint}>
            <input
              name="telegramChannel"
              maxLength={120}
              defaultValue={tg ? (isTelegramInvite(tg) ? `https://t.me/${tg}` : `@${tg}`) : ""}
              placeholder="@kanal"
              className="input"
            />
          </Field>
          <Field label={d.profileForm.instagram}>
            <input name="instagram" maxLength={80} defaultValue={editor.instagram ?? ""} placeholder="username" className="input" />
          </Field>
          <Field label={d.profileForm.youtube}>
            <input
              name="youtube"
              type="url"
              maxLength={300}
              defaultValue={editor.youtube ?? ""}
              placeholder="https://youtube.com/@..."
              className="input"
            />
          </Field>
          <SubmitButton className="w-full">{f.saveLinks}</SubmitButton>
        </ActionForm>

        <ActionForm action={addPortfolioItem} resetOnSuccess className="card h-fit space-y-4 p-6">
          <div>
            <h2 className="text-lg font-medium">{f.byLinkTitle}</h2>
            <p className="mt-1 text-sm text-muted">{f.byLinkHint}</p>
          </div>
          <Field label={f.title}>
            <input name="title" required minLength={2} maxLength={100} className="input" />
          </Field>
          <Field label={f.url} hint={f.urlHint}>
            <input name="url" type="url" required pattern="https://.*" placeholder="https://youtu.be/..." className="input" />
          </Field>
          <Field label={f.category}>
            <select name="category" className="input" defaultValue={defaultCategory}>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`${f.cover} (${d.common.optional})`} hint={f.coverHint}>
            <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
          </Field>
          <SubmitButton className="w-full">{f.add}</SubmitButton>
          <p className="text-center text-xs text-muted">{fmt(f.count, { n: links.length, max: LIMITS.portfolioItems })}</p>
        </ActionForm>
      </section>

      {links.length > 0 && (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {links.map((it) => (
            <div key={it.id} className="relative">
              <VideoTile item={it} categoryLabel={d.categories[it.category]} />
              <ChangeCover id={it.id} d={d} />
              <DeleteButton id={it.id} d={d} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ChangeCover({ id, d }: { id: string; d: Dict }) {
  return (
    <CoverButton
      action={setPortfolioCover.bind(null, id)}
      labels={{ change: d.portfolioForm.coverChange, errType: d.errors.uploadType, errSize: d.errors.uploadSize }}
      className="absolute top-3 right-[3.25rem]"
    />
  );
}

function DeleteButton({ id, d }: { id: string; d: Dict }) {
  return (
    <ActionForm action={deletePortfolioItem.bind(null, id)} confirmText={`${d.common.delete}?`} hideMessage className="absolute top-3 right-3">
      <SubmitButton variant="danger" size="sm" className="!h-8 !w-8 !p-0">
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">{d.common.delete}</span>
      </SubmitButton>
    </ActionForm>
  );
}

type UploadProgress = { pct: number; stalled: boolean };

/** Yuklanayotgan videolar: serverga qancha yetib kelgani va 2 daqiqadan beri yangi bo'lak kelmaganmi */
async function uploadProgress(videos: PortfolioItem[]) {
  const map = new Map<string, UploadProgress>();
  await Promise.all(
    videos
      .filter((v) => v.videoStatus === "uploading" && v.uploadBytes)
      .map(async (v) => {
        const st = await stat(tmpPath(v.id, "part")).catch(() => null);
        const last = st?.mtimeMs ?? v.createdAt.getTime();
        map.set(v.id, {
          pct: Math.min(100, Math.floor(((st?.size ?? 0) / v.uploadBytes!) * 100)),
          stalled: Date.now() - last > 2 * 60_000,
        });
      }),
  );
  return map;
}

function StatusTile({ item, d, progress }: { item: PortfolioItem; d: Dict; progress?: UploadProgress }) {
  const f = d.portfolioForm;
  const s = item.videoStatus;
  let icon = <Loader2 className="h-6 w-6 animate-spin" />;
  let text = s === "queued" ? f.statusQueued : f.statusProcessing;
  let danger = false;
  if (s === "uploading") {
    const stalled = progress?.stalled ?? true;
    icon = stalled ? <AlertTriangle className="h-6 w-6" /> : <Upload className="h-6 w-6" />;
    text = stalled ? f.statusStalled : fmt(f.statusUploading, { p: progress?.pct ?? 0 });
  } else if (s === "failed") {
    icon = <AlertTriangle className="h-6 w-6" />;
    danger = true;
    text =
      item.videoError === "duration"
        ? fmt(f.failDuration, { sec: VIDEO.maxSeconds })
        : item.videoError === "invalid"
          ? f.failInvalid
          : f.failTranscode;
  }
  const cover = danger ? null : uploadUrl(item.coverKey);
  return (
    <div>
      <div
        className={`relative flex aspect-video flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed bg-card-2 p-5 text-center text-sm ${danger ? "border-danger/50 text-danger" : "border-line-strong"}`}
      >
        {cover && (
          // Montajor yuklagan muqova — video tayyorlanguncha ham ko'rinib tursin
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-black/60" aria-hidden />
          </>
        )}
        <span className={cover ? "relative grid place-items-center gap-2 text-white" : "contents"}>
          {icon}
          <p className="max-w-[26ch]">{text}</p>
        </span>
      </div>
      <p className="mt-3 truncate px-1 text-sm font-medium">{item.title}</p>
    </div>
  );
}
