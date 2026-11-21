import { requireAdmin } from "@/lib/auth/current";
import { asc } from "drizzle-orm";
import { adminSaveCards, adminSaveTier, adminTelegramSetup, adminTelegramTest } from "@/actions/admin";
import { AdminHead } from "@/components/admin-bits";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/page-bits";
import { db } from "@/db";
import { priceTiers, type PriceTier } from "@/db/schema";
import { PAYMENT_METHODS } from "@/lib/constants";
import { getPaymentCards } from "@/lib/data";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function TierForm({ t }: { t?: PriceTier }) {
  return (
    <ActionForm action={adminSaveTier.bind(null, t?.id ?? null)} className="flex flex-wrap items-end gap-2 rounded-2xl border border-line p-3">
      <Field label="Min $" className="w-24">
        <input name="minUsd" type="number" required min={0} defaultValue={t?.minUsd} className="input !h-10" />
      </Field>
      <Field label="Max $ (bo'sh = cheksiz)" className="w-40">
        <input name="maxUsd" type="number" min={1} defaultValue={t?.maxUsd ?? ""} className="input !h-10" />
      </Field>
      <Field label="Tartib" className="w-20">
        <input name="sort" type="number" defaultValue={t?.sort ?? 0} className="input !h-10" />
      </Field>
      <label className="check mb-1">
        <input type="checkbox" name="isActive" defaultChecked={t?.isActive ?? true} /> Faol
      </label>
      <SubmitButton size="sm" variant={t ? "ghost" : "primary"}>
        {t ? "Saqlash" : "+ Qo'shish"}
      </SubmitButton>
    </ActionForm>
  );
}

export default async function AdminSettings() {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const [cards, tiers] = await Promise.all([getPaymentCards(), db.select().from(priceTiers).orderBy(asc(priceTiers.sort))]);
  const slots = [...cards, ...Array(Math.max(0, 4 - cards.length)).fill(null)].slice(0, 4);
  const tg = env.telegram;
  const check = (v: boolean) => (v ? "✅" : "❌");

  return (
    <>
      <AdminHead
        title="Sozlamalar"
        text="Montajorlar pul o'tkazadigan kartalar, narx bo'limlari (katalog filtri) va to'lov xabarlari keladigan Telegram bot. Bir marta sozlansa, odatda qayta tegish shart emas."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <ActionForm action={adminSaveCards} className="card card-solid space-y-4 p-6">
            <div>
              <h2 className="text-lg font-medium">To&apos;lov kartalari</h2>
              <p className="text-sm text-muted">
                Montajorlar TOP uchun shu kartalarga o&apos;tkazadi. Bo&apos;sh qoldirilgan qatorlar o&apos;chiriladi.
              </p>
            </div>
            {slots.map((c, i) => (
              <div key={i} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[132px_1fr]">
                <select name={`type${i}`} defaultValue={c?.type ?? "UZCARD"} className="input !h-10">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <input
                  name={`number${i}`}
                  defaultValue={c?.number ?? ""}
                  placeholder="8600 0000 0000 0000"
                  inputMode="numeric"
                  className="input !h-10 font-mono"
                />
                <input name={`holder${i}`} defaultValue={c?.holder ?? ""} placeholder="Karta egasi" className="input !h-10 sm:col-start-2" />
                <input name={`bank${i}`} defaultValue={c?.bank ?? ""} placeholder="Bank (ixtiyoriy)" className="input !h-10 sm:col-start-2" />
              </div>
            ))}
            <SubmitButton>Kartalarni saqlash</SubmitButton>
          </ActionForm>
        </section>

        <section className="space-y-6">
          <div className="card card-solid space-y-4 p-6">
            <h2 className="text-lg font-medium">Narx bo&apos;limlari (USD)</h2>
            <p className="text-sm text-muted">
              Montajorlar boshlang&apos;ich narxi va buyurtmalar byudjeti bo&apos;yicha shu bo&apos;limlarga tushadi. Oraliq: [min, max).
            </p>
            {tiers.map((t) => (
              <TierForm key={t.id} t={t} />
            ))}
            <TierForm />
          </div>

          <div className="card card-solid space-y-3 p-6">
            <h2 className="text-lg font-medium">Avtomatik to&apos;lov tasdiqlash</h2>
            <p className="text-sm text-muted">
              Har bir montajorga shaxsiy summa beriladi (narx + 100–999 so&apos;m kod). Kartaga aynan shu summa tushgani haqidagi bank xabari kelsa —
              TOP o&apos;zi yoqiladi, chek tekshirish shart emas.
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>
                <b>To&apos;liq avtomatik:</b> kartaga SMS keladigan Android telefonga &quot;SMS forwarder&quot; (webhook) ilovasini o&apos;rnating va
                bankdan keladigan SMS&apos;larni shu manzilga POST qiling:
                <code className="mt-1 block rounded-lg bg-card-2 px-2 py-1.5 text-xs break-all">
                  {env.appUrl}/api/payments/incoming?key=PAYMENT_WEBHOOK_SECRET
                </code>
              </li>
              <li>
                <b>Bir bosishda:</b> bank bildirishnomasini (CardXabar, HUMO bot va h.k.) admin Telegram botga forward qiling — bot summani topib,
                to&apos;lovni tasdiqlaydi.
              </li>
            </ol>
            <ul className="space-y-1 text-sm">
              <li>{check(!!env.paymentWebhookSecret)} PAYMENT_WEBHOOK_SECRET</li>
            </ul>
            <p className="text-xs text-muted">
              24 soat ichida to&apos;lanmagan (chek ham yuborilmagan) to&apos;lovlar o&apos;zi bekor bo&apos;ladi va joy bo&apos;shaydi.
            </p>
          </div>

          <div className="card card-solid space-y-4 p-6">
            <h2 className="text-lg font-medium">Telegram bot</h2>
            <ul className="space-y-1 text-sm">
              <li>{check(!!tg.token)} TELEGRAM_BOT_TOKEN</li>
              <li>{check(!!tg.adminChatId)} TELEGRAM_ADMIN_CHAT_ID</li>
              <li>
                {check(tg.adminIds.length > 0)} TELEGRAM_ADMIN_IDS ({tg.adminIds.length} ta)
              </li>
              <li>{check(!!tg.webhookSecret)} TELEGRAM_WEBHOOK_SECRET</li>
              <li>{check(env.appUrl.startsWith("https://"))} APP_URL https</li>
            </ul>
            <p className="text-xs text-muted">
              Botga /start yozing — u chat ID va sizning ID raqamingizni ko&apos;rsatadi. Keyin .env ga yozib, quyidagi tugma bilan webhookni ulang.
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionForm action={adminTelegramSetup}>
                <SubmitButton size="sm">Webhookni ulash</SubmitButton>
              </ActionForm>
              <ActionForm action={adminTelegramTest}>
                <SubmitButton size="sm" variant="ghost">
                  Test xabar
                </SubmitButton>
              </ActionForm>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
