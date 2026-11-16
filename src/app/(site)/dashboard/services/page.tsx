import { asc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { addService, deleteService } from "@/actions/portfolio";
import { ActionForm, SubmitButton } from "@/components/form";
import { Empty, Field } from "@/components/page-bits";
import { db } from "@/db";
import { services } from "@/db/schema";
import { getEditorProfileByUser, requireUser } from "@/lib/auth/current";
import { fmt, getDict } from "@/lib/i18n";

export default async function ServicesPage() {
  const user = await requireUser("/dashboard/services");
  const editor = await getEditorProfileByUser(user.id);
  if (!editor) redirect("/dashboard/profile");
  const [d, list] = await Promise.all([
    getDict(),
    db.select().from(services).where(eq(services.editorId, editor.id)).orderBy(asc(services.sort), asc(services.priceUsd)),
  ]);
  const f = d.servicesForm;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <ActionForm action={addService} resetOnSuccess className="card h-fit space-y-4 p-6">
        <h2 className="text-lg font-medium">{f.add}</h2>
        <Field label={f.title}>
          <input name="title" required minLength={2} maxLength={100} placeholder={f.titlePh} className="input" />
        </Field>
        <Field label={`${f.description} (${d.common.optional})`}>
          <textarea name="description" maxLength={600} rows={3} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={f.price}>
            <input name="priceUsd" type="number" required min={1} max={10000} defaultValue={editor.priceFrom} className="input" />
          </Field>
          <Field label={f.days}>
            <input name="deliveryDays" type="number" required min={1} max={90} defaultValue={3} className="input" />
          </Field>
        </div>
        <SubmitButton className="w-full">{f.add}</SubmitButton>
      </ActionForm>

      {list.length === 0 ? (
        <Empty>{f.empty}</Empty>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="card flex items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.title}</p>
                {s.description && <p className="mt-1 text-sm text-muted">{s.description}</p>}
                <p className="mt-1 text-xs text-muted">{fmt(d.profile.delivery, { n: s.deliveryDays })}</p>
              </div>
              <span className="text-2xl font-light">${s.priceUsd}</span>
              <ActionForm action={deleteService.bind(null, s.id)} confirmText={`${d.common.delete}?`} hideMessage>
                <SubmitButton variant="ghost" size="sm">
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
