import type { Metadata } from "next";
import { createOrder } from "@/actions/orders";
import { Avatar } from "@/components/avatar";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field, PageHero } from "@/components/page-bits";
import { requireUser } from "@/lib/auth/current";
import { CATEGORY_KEYS } from "@/lib/constants";
import { getEditorBySlug } from "@/lib/data";
import { fmt, getDict } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false } };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ editor?: string }> }) {
  const sp = await searchParams;
  const slug = (sp.editor ?? "").slice(0, 40);
  await requireUser(`/orders/new${slug ? `?editor=${encodeURIComponent(slug)}` : ""}`);
  const [d, editor] = await Promise.all([getDict(), slug ? getEditorBySlug(slug) : null]);
  const p = editor?.profile && !editor.profile.isHidden && editor.profile.isPublished ? editor.profile : null;

  const tomorrow = new Date(Date.now() + 86_400_000 + 5 * 3_600_000).toISOString().slice(0, 10);
  const inWeek = new Date(Date.now() + 7 * 86_400_000 + 5 * 3_600_000).toISOString().slice(0, 10);

  return (
    <>
      <PageHero title={p ? fmt(d.order.newDirect, { name: p.displayName }) : d.order.newTitle} subtitle={p ? p.headline : d.order.newPublic} />
      <div className="container-x mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <ActionForm action={createOrder} className="card space-y-5 p-6 sm:p-8">
          {p && <input type="hidden" name="editor" value={p.slug} />}
          <Field label={d.order.title}>
            <input name="title" required minLength={5} maxLength={120} placeholder={d.order.titlePh} className="input" />
          </Field>
          <Field label={d.order.description}>
            <textarea name="description" required minLength={20} maxLength={4000} rows={6} placeholder={d.order.descriptionPh} className="input" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label={d.order.category}>
              <select name="category" className="input" defaultValue={p?.categories[0] ?? "reels"}>
                {CATEGORY_KEYS.map((c) => (
                  <option key={c} value={c}>
                    {d.categories[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={d.order.budget}>
              <input name="budgetUsd" type="number" required min={5} max={10000} defaultValue={p?.priceFrom ?? 20} className="input" />
            </Field>
            <Field label={d.order.deadline}>
              <input name="deadline" type="date" required min={tomorrow} defaultValue={inWeek} className="input" />
            </Field>
          </div>
          <SubmitButton size="lg" className="w-full sm:w-auto">
            {d.order.create}
          </SubmitButton>
        </ActionForm>

        {p && editor && (
          <aside className="card h-fit p-5">
            <div className="flex items-center gap-3">
              <Avatar name={p.displayName} avatarKey={p.avatarKey} image={editor.userImage} size={48} />
              <div>
                <p className="font-medium">{p.displayName}</p>
                <p className="text-xs text-muted">{d.levels[p.level]}</p>
              </div>
            </div>
            {editor.services.length > 0 && (
              <ul className="mt-4 divide-y divide-line text-sm">
                {editor.services.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3 py-2.5">
                    <span>{s.title}</span>
                    <span className="shrink-0">${s.priceUsd}</span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
