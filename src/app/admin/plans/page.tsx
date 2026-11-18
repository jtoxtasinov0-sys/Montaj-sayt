import { requireAdmin } from "@/lib/auth/current";
import { asc } from "drizzle-orm";
import { adminSavePlan } from "@/actions/admin";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/page-bits";
import { db } from "@/db";
import { promotionPlans, type PromotionPlan } from "@/db/schema";
import { slotUsage } from "@/lib/payments";

export const dynamic = "force-dynamic";

const NO_EDITOR = "00000000-0000-0000-0000-000000000000";

function PlanForm({ plan, used }: { plan?: PromotionPlan; used?: number }) {
  return (
    <ActionForm action={adminSavePlan.bind(null, plan?.id ?? null)} className="card space-y-4 p-5">
      <p className="font-medium">{plan ? `Reja #${plan.id}` : "Yangi reja"}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nomi">
          <input name="name" required maxLength={40} defaultValue={plan?.name} className="input" />
        </Field>
        <Field label="Narx (so'm)">
          <input name="priceUzs" type="number" required min={1000} defaultValue={plan?.priceUzs ?? 30000} className="input" />
        </Field>
        <Field label="Muddat (kun)">
          <input name="days" type="number" required min={1} max={90} defaultValue={plan?.days ?? 10} className="input" />
        </Field>
        <Field label="Ustuvorlik raqami" hint="Kattaroq raqam = katalogda yuqoriroq">
          <input name="weight" type="number" required min={1} max={1000} defaultValue={plan?.weight ?? 10} className="input" />
        </Field>
        <Field label="Tartib">
          <input name="sort" type="number" min={0} max={100} defaultValue={plan?.sort ?? 0} className="input" />
        </Field>
        <Field label="Joylar soni (0 = cheksiz)" hint={used !== undefined ? `Hozir band: ${used}${plan?.slots ? ` / ${plan.slots}` : ""}` : undefined}>
          <input name="slots" type="number" min={0} max={1000} defaultValue={plan?.slots ?? 0} className="input" />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="check">
          <input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} /> Faol
        </label>
        <label className="check">
          <input type="checkbox" name="isPopular" defaultChecked={plan?.isPopular ?? false} /> Ommabop belgisi
        </label>
      </div>
      <SubmitButton size="sm">Saqlash</SubmitButton>
    </ActionForm>
  );
}

export default async function AdminPlans() {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const plans = await db.select().from(promotionPlans).orderBy(asc(promotionPlans.sort));
  const used = await Promise.all(plans.map((p) => slotUsage(p.weight, NO_EDITOR)));
  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-5 text-sm leading-relaxed">
        <p className="font-medium">Katalogda kim qayerda turadi?</p>
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Hozirgi tartib:</span>
          {[...plans]
            .sort((a, b) => b.weight - a.weight)
            .map((p, i) => (
              <span key={p.id} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted">→</span>}
                <span className="chip chip-primary">
                  {i + 1}. {p.name}
                </span>
              </span>
            ))}
          <span className="text-muted">→ TOP olmaganlar (reyting bo&apos;yicha)</span>
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>
            <b className="font-medium text-fg">Ustuvorlik raqami</b> faqat rejalarni bir-biridan yuqori qo&apos;yish uchun: raqami kattasi tepada
            turadi. Raqamning o&apos;zi hech narsani anglatmaydi — 10/20/30 o&apos;rniga 1/2/3 yozsangiz ham xuddi shunday ishlaydi. Faqat har bir
            rejaga <b className="font-medium text-fg">har xil</b> raqam bering.
          </li>
          <li>Bir rejadagilar har soatda navbat bilan eng tepaga chiqadi — hammaga teng vaqt.</li>
          <li>
            <b className="font-medium text-fg">Joylar soni</b> to&apos;lsa, montajor shu rejani tanlay olmaydi. Tekshirilayotgan to&apos;lov ham joy
            band qiladi, rad etilsa joy bo&apos;shaydi.
          </li>
          <li>TOP faol bo&apos;lgan montajor yana to&apos;lasa, kunlar oxiriga qo&apos;shiladi.</li>
        </ul>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p, i) => (
          <PlanForm key={p.id} plan={p} used={used[i].used} />
        ))}
        <PlanForm />
      </div>
    </div>
  );
}
