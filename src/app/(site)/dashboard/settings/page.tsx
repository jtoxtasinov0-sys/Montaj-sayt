import { eq } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import { saveUserSettings } from "@/actions/profile";
import { disconnectTelegram } from "@/actions/room";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/page-bits";
import { TelegramConnect } from "@/components/telegram-connect";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth/current";
import { getDict } from "@/lib/i18n";
import { userNotifyEnabled } from "@/lib/notify";

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  const [d, [tg]] = await Promise.all([
    getDict(),
    db.select({ chatId: users.tgChatId }).from(users).where(eq(users.id, user.id)).limit(1),
  ]);
  const f = d.settingsForm;
  const n = d.notify;
  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">
    <ActionForm action={saveUserSettings} className="card space-y-5 p-6 sm:p-8">
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

    {/* Telegram bildirishnomalari: bot "yangi xabar / fayl / buyurtma" deb yozadi, fayl va xabarni ham yetkazadi */}
    <section className="card h-fit space-y-4 p-6">
      <h2 className="text-lg font-medium">{n.title}</h2>
      <p className="text-sm text-muted">{n.text}</p>
      {!userNotifyEnabled() ? (
        <p className="text-sm text-muted">{n.off}</p>
      ) : tg?.chatId ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> {n.connected}
          </p>
          <ActionForm action={disconnectTelegram}>
            <SubmitButton variant="ghost" size="sm">
              {n.disconnect}
            </SubmitButton>
          </ActionForm>
        </div>
      ) : (
        <div className="space-y-2">
          <TelegramConnect label={n.connect} />
          <p className="hint">{n.step}</p>
        </div>
      )}
    </section>
    </div>
  );
}
