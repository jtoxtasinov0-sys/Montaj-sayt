import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { saveEditorProfile } from "@/actions/profile";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/page-bits";
import { ProfileAvatar } from "@/components/profile-avatar";
import { getEditorProfileByUser, requireUser } from "@/lib/auth/current";
import { CATEGORY_KEYS, LEVELS, ROLES, SOFTWARE } from "@/lib/constants";
import { getContactsHidden } from "@/lib/data";
import { getDict } from "@/lib/i18n";

export default async function ProfileFormPage() {
  const user = await requireUser("/dashboard/profile");
  const [d, p, contactsHidden] = await Promise.all([getDict(), getEditorProfileByUser(user.id), getContactsHidden()]);
  const f = d.profileForm;

  return (
    <ActionForm action={saveEditorProfile} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card space-y-5 p-6 sm:p-8">
        {!p && (
          <div className="rounded-2xl border border-line p-4 text-sm">
            <p className="font-medium">{d.dashboard.becomeTitle}</p>
            <p className="mt-1 text-muted">{d.dashboard.becomeText}</p>
          </div>
        )}
        <Field label={f.roles} hint={f.rolesHint}>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <label key={r} className="check">
                <input type="checkbox" name="roles" value={r} defaultChecked={p ? p.roles.includes(r) : r === "editor"} />
                {d.roles[r]}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={f.displayName}>
            <input name="displayName" required minLength={2} maxLength={60} defaultValue={p?.displayName ?? user.name} className="input" />
          </Field>
          <Field label={f.city}>
            <input name="city" maxLength={60} defaultValue={p?.city ?? "Toshkent"} className="input" />
          </Field>
        </div>
        <Field label={f.headline}>
          <input name="headline" maxLength={140} defaultValue={p?.headline} placeholder={f.headlinePh} className="input" />
        </Field>
        <Field label={f.bio}>
          <textarea name="bio" maxLength={3000} rows={5} defaultValue={p?.bio} className="input" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={f.level}>
            <select name="level" defaultValue={p?.level ?? "BEGINNER"} className="input">
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {d.levels[l]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={f.experienceYears}>
            <input name="experienceYears" type="number" min={0} max={50} defaultValue={p?.experienceYears ?? 0} className="input" />
          </Field>
          <Field label={f.priceFrom}>
            <input name="priceFrom" type="number" required min={5} max={5000} defaultValue={p?.priceFrom ?? 10} className="input" />
          </Field>
        </div>
        <p className="hint -mt-3">{f.priceFromHint}</p>

        <Field label={f.categories}>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((c) => (
              <label key={c} className="check">
                <input type="checkbox" name="categories" value={c} defaultChecked={p?.categories.includes(c)} />
                {d.categories[c]}
              </label>
            ))}
          </div>
        </Field>
        <Field label={f.skills}>
          <div className="flex flex-wrap gap-2">
            {SOFTWARE.map((s) => (
              <label key={s} className="check">
                <input type="checkbox" name="skills" value={s} defaultChecked={p?.skills.includes(s)} />
                {s}
              </label>
            ))}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={f.telegram} hint={contactsHidden ? f.telegramPrivate : p ? f.linksMoved : undefined}>
            <input name="telegram" maxLength={60} defaultValue={p?.telegram ?? ""} placeholder={f.telegramPh} className="input" />
          </Field>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card space-y-4 p-6">
          <div className="flex items-center gap-4">
            <ProfileAvatar name={p?.displayName ?? user.name} avatarKey={p?.avatarKey} image={user.image} size={64} />
            <div className="text-sm">
              <p className="font-medium">{f.avatar}</p>
              <p className="text-xs text-muted">{f.avatarHint}</p>
            </div>
          </div>
          <label className="check w-full">
            <input type="checkbox" name="isAvailable" defaultChecked={p?.isAvailable ?? true} /> {f.available}
          </label>
          <label className="check w-full">
            <input type="checkbox" name="isPublished" defaultChecked={p?.isPublished ?? true} /> {f.published}
          </label>
          <SubmitButton size="lg" className="w-full">
            {p ? d.common.save : f.create}
          </SubmitButton>
          {p && (
            <Link href={`/editors/${p.slug}`} className="btn btn-ghost w-full">
              <ExternalLink className="h-4 w-4" /> {d.dashboard.viewProfile}
            </Link>
          )}
        </div>
      </aside>
    </ActionForm>
  );
}
