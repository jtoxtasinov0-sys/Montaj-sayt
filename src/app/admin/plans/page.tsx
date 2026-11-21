import { requireAdmin } from "@/lib/auth/current";
import { and, asc, eq, gt } from "drizzle-orm";
import { Flame } from "lucide-react";
import Link from "next/link";
import { adminSavePlan } from "@/actions/admin";
import { AdminHead, PanelTitle, shortDay } from "@/components/admin-bits";
import { Avatar } from "@/components/avatar";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/page-bits";
import { db } from "@/db";
import { editorProfiles, promotionPlans, users } from "@/db/schema";
import { TOP_ROTATE_MINUTES } from "@/lib/constants";
import { slotUsage } from "@/lib/payments";
import { cn, daysLeft, formatUzs } from "@/lib/utils";

export const dynamic = "force-dynamic";

const NO_EDITOR = "00000000-0000-0000-0000-000000000000";

export default async function AdminPlan() {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  // Saytda bitta TOP tarifi bor
  const [plan] = await db.select().from(promotionPlans).orderBy(asc(promotionPlans.sort), asc(promotionPlans.id)).limit(1);
  const [usage, onTop] = await Promise.all([
    plan ? slotUsage(plan.weight, NO_EDITOR) : Promise.resolve({ used: 0, nextFree: null }),
    db
      .select({ e: editorProfiles, image: users.image })
      .from(editorProfiles)
      .innerJoin(users, eq(users.id, editorProfiles.userId))
      .where(and(gt(editorProfiles.boostWeight, 0), gt(editorProfiles.boostUntil, new Date())))
      .orderBy(asc(editorProfiles.boostUntil)),
  ]);
  const price = plan?.priceUzs ?? 50000;
  const days = plan?.days ?? 7;
  const slots = plan?.slots ?? 20;
  const active = plan?.isActive ?? true;
  const pct = slots ? Math.min(100, Math.round((usage.used / slots) * 100)) : 0;

  return (
    <div className="space-y-4">
      <AdminHead
        title="TOP tarif"
        text="Montajor pul to'lab katalogda va bosh sahifada eng tepada turadi. Saytda bitta tarif bor — shu yerda uning narxini, necha kunligini va nechta joy borligini o'zgartirasiz."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        {/* Montajorlar ko'radigan tarif — xuddi saytdagidek */}
        <section className="card card-solid flex flex-col p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="chip chip-accent">
              <Flame className="h-3 w-3" /> TOP
            </span>
            <span className={cn("chip", !active && "text-danger")}>{active ? "Sotuvda" : "Sotuv to'xtatilgan"}</span>
          </div>
          <p className="mt-8 text-[clamp(2.6rem,6vw,3.75rem)] leading-none font-light tracking-tight tabular-nums">
            {formatUzs(price)} <span className="text-lg text-muted">so&apos;m</span>
          </p>
          <p className="mt-2 mb-10 text-muted">{days} kun uchun</p>

          <div className="mt-auto border-t border-line pt-5 max-lg:mt-8">
            <div className="flex items-end justify-between gap-3 text-sm">
              <span className="text-muted">Band joylar</span>
              <span className="tabular-nums">
                {usage.used} / {slots || "∞"}
              </span>
            </div>
            {slots > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-2">
                <div className="h-full rounded-full bg-fg" style={{ width: `${pct}%` }} />
              </div>
            )}
            <p className="mt-2 text-xs text-muted">
              {slots > 0 && usage.used >= slots
                ? `Joylar to'lgan — yangi montajor sotib ola olmaydi${usage.nextFree ? `. Birinchi joy ${shortDay(usage.nextFree)} da bo'shaydi` : ""}.`
                : "Tasdiq kutayotgan to'lovlar ham joy band qiladi."}
            </p>
          </div>
        </section>

        <ActionForm action={adminSavePlan} className="card card-solid space-y-5 p-6 sm:p-8">
          <PanelTitle title="Tarifni o'zgartirish" text="Saqlangach yangi narx darhol saytda ko'rinadi. Allaqachon TOP'dagilarga ta'sir qilmaydi." />
          <Field label="Narx (so'm)" hint="Montajor to'laydigan summa">
            <input name="priceUzs" type="number" required min={1000} step={1000} defaultValue={price} className="input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Muddat (kun)" hint="To'lovdan keyin necha kun TOP'da turadi">
              <input name="days" type="number" required min={1} max={90} defaultValue={days} className="input" />
            </Field>
            <Field label="Joylar soni" hint="Bir vaqtda nechta montajor TOP'da tura oladi. 0 = cheklovsiz">
              <input name="slots" type="number" min={0} max={1000} defaultValue={slots} className="input" />
            </Field>
          </div>
          <label className="check">
            <input type="checkbox" name="isActive" defaultChecked={active} /> Sotuvda — montajorlar sotib ola oladi
          </label>
          <div>
            <SubmitButton>Saqlash</SubmitButton>
          </div>
        </ActionForm>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <section className="card card-solid p-6">
          <PanelTitle title="Hozir TOP'dagilar" text="Muddati tugashiga qarab" href="/admin/editors" linkLabel="TOP berish →" />
          {onTop.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
              Hozircha hech kim TOP&apos;da emas
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {onTop.map(({ e, image }) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <Avatar name={e.displayName} avatarKey={e.avatarKey} image={image} size={36} />
                  <Link href={`/editors/${e.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline hover:underline-offset-4">
                    {e.displayName}
                  </Link>
                  <span className="shrink-0 text-right text-xs text-muted">
                    <span className="block text-sm text-fg tabular-nums">{daysLeft(e.boostUntil!)} kun qoldi</span>
                    {shortDay(e.boostUntil!)} gacha
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card-solid p-6">
          <PanelTitle title="Qanday ishlaydi?" />
          <ol className="space-y-3 text-sm">
            {[
              <>
                Montajor kabinetida &quot;TOP ga chiqish&quot; tugmasini bosadi va o&apos;ziga berilgan aniq summani kartaga o&apos;tkazadi (masalan{" "}
                {formatUzs(price + 437)} — oxirgi raqamlar uning shaxsiy kodi).
              </>,
              <>
                Bank xabari kelishi bilan TOP o&apos;zi yoqiladi. Chek yuborgan bo&apos;lsa — &quot;To&apos;lovlar&quot; bo&apos;limida siz
                tasdiqlaysiz.
              </>,
              <>
                TOP&apos;dagilar katalogda va bosh sahifada eng tepada turadi, har {TOP_ROTATE_MINUTES} daqiqada navbat bilan almashadi — hammaga
                teng.
              </>,
              <>Joylar to&apos;lsa, yangi montajor kutadi. TOP&apos;dagi montajor yana to&apos;lasa, kunlar oxiriga qo&apos;shiladi.</>,
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line-strong text-xs tabular-nums">{i + 1}</span>
                <span className="pt-0.5 leading-relaxed text-muted">{t}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
