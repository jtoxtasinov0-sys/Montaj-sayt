import { asc, desc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { addPortfolioItem, deletePortfolioItem } from "@/actions/portfolio";
import { ActionForm, SubmitButton } from "@/components/form";
import { Empty, Field } from "@/components/page-bits";
import { VideoTile } from "@/components/video-tile";
import { db } from "@/db";
import { portfolioItems } from "@/db/schema";
import { getEditorProfileByUser, requireUser } from "@/lib/auth/current";
import { CATEGORY_KEYS, LIMITS } from "@/lib/constants";
import { fmt, getDict } from "@/lib/i18n";

export default async function PortfolioPage() {
  const user = await requireUser("/dashboard/portfolio");
  const editor = await getEditorProfileByUser(user.id);
  if (!editor) redirect("/dashboard/profile");
  const [d, items] = await Promise.all([
    getDict(),
    db.select().from(portfolioItems).where(eq(portfolioItems.editorId, editor.id)).orderBy(asc(portfolioItems.sort), desc(portfolioItems.createdAt)),
  ]);
  const f = d.portfolioForm;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <ActionForm action={addPortfolioItem} resetOnSuccess className="card h-fit space-y-4 p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-medium">{f.add}</h2>
        <Field label={f.title}>
          <input name="title" required minLength={2} maxLength={100} className="input" />
        </Field>
        <Field label={f.url} hint={f.urlHint}>
          <input name="url" type="url" required pattern="https://.*" placeholder="https://youtu.be/..." className="input" />
        </Field>
        <Field label={f.category}>
          <select name="category" className="input" defaultValue={editor.categories[0] ?? "reels"}>
            {CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>
                {d.categories[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${f.cover} (${d.common.optional})`} hint={f.coverHint}>
          <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
        </Field>
        <SubmitButton className="w-full">{f.add}</SubmitButton>
        <p className="text-center text-xs text-muted">{fmt(f.count, { n: items.length, max: LIMITS.portfolioItems })}</p>
      </ActionForm>

      {items.length === 0 ? (
        <Empty>{f.empty}</Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} className="relative">
              <VideoTile item={it} categoryLabel={d.categories[it.category]} />
              <ActionForm action={deletePortfolioItem.bind(null, it.id)} confirmText={`${d.common.delete}?`} hideMessage className="absolute top-3 right-3">
                <SubmitButton variant="danger" size="sm" className="!h-8 !w-8 !p-0">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{d.common.delete}</span>
                </SubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
