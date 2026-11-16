import { saveUserSettings } from "@/actions/profile";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/page-bits";
import { requireUser } from "@/lib/auth/current";
import { getDict } from "@/lib/i18n";

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  const d = await getDict();
  const f = d.settingsForm;
  return (
    <ActionForm action={saveUserSettings} className="card max-w-2xl space-y-5 p-6 sm:p-8">
      <h2 className="text-lg font-medium">{f.title}</h2>
      <Field label={f.email}>
        <input value={user.email} disabled className="input opacity-70" />
      </Field>
      <Field label={f.name}>
        <input name="name" required minLength={2} maxLength={80} defaultValue={user.name} className="input" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f.telegram}>
          <input name="telegram" maxLength={60} defaultValue={user.telegram ?? ""} placeholder="username" className="input" />
        </Field>
        <Field label={`${f.phone} (${d.common.optional})`}>
          <input name="phone" type="tel" maxLength={20} defaultValue={user.phone ?? ""} placeholder="+998 90 123 45 67" className="input" />
        </Field>
      </div>
      <SubmitButton>{d.common.save}</SubmitButton>
    </ActionForm>
  );
}
