import { Check, Flame, Info, Repeat, Users, Zap } from "lucide-react";
import { redirect } from "next/navigation";
import { attachReceipt, cancelPayment, startPayment } from "@/actions/payments";
import { AutoRefresh } from "@/components/auto-refresh";
import { ActionForm, CopyButton, SubmitButton } from "@/components/form";
import { Field, StatusBadge } from "@/components/page-bits";
import { PaymentCardView } from "@/components/payment-card";
import { getEditorProfileByUser, requireUser } from "@/lib/auth/current";
import { TOP_ROTATE_MINUTES } from "@/lib/constants";
import { myPayments } from "@/lib/dashboard-data";
import { getPaymentCards, getPlans } from "@/lib/data";
import { expireStalePayments, PENDING_TTL_MS, slotUsage } from "@/lib/payments";
import { fmt, getDict, getLocale } from "@/lib/i18n";
import { cn, daysLeft, formatDate, formatUzs } from "@/lib/utils";

export default async function PromotePage() {
  const user = await requireUser("/dashboard/promote");
  const editor = await getEditorProfileByUser(user.id);
  if (!editor) redirect("/dashboard/profile");
  await expireStalePayments();
  const [d, locale, plans, cards, history] = await Promise.all([getDict(), getLocale(), getPlans(), getPaymentCards(), myPayments(user.id)]);
  const usage = await Promise.all(plans.map((p) => slotUsage(p.weight, editor.id)));
  const slots = new Map(plans.map((p, i) => [p.id, { ...usage[i], full: p.slots > 0 && usage[i].used >= p.slots }]));
  const boosted = editor.boostWeight > 0 && editor.boostUntil && editor.boostUntil > new Date();
  const pending = history.find((h) => h.status === "PENDING");
  const m = TOP_ROTATE_MINUTES;

  return (
    <div className="space-y-8">
      {/* Hozirgi holat */}
      <div className={cn("card flex flex-wrap items-center gap-4 p-5", boosted && "border-fg")}>
        <span className={cn("grid h-11 w-11 place-items-center rounded-full border", boosted ? "border-fg bg-fg text-bg" : "border-line text-muted")}>
          <Flame className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-xs text-muted">{d.promote.current}</p>
          <p className="font-medium">
            {boosted
              ? `${fmt(d.dashboard.boostActive, { plan: "TOP", days: daysLeft(editor.boostUntil!) })} · ${formatDate(editor.boostUntil!, locale)}`
              : d.dashboard.boostNone}
          </p>
        </div>
      </div>

      {pending ? (
        /* 2-qadam: aniq summani o'tkazish — bank xabari kelishi bilan avtomatik tasdiqlanadi */
        <section className="space-y-4">
          <AutoRefresh seconds={15} />
          <div className="panel-invert rounded-[1.5rem] p-6 sm:p-8">
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              {d.promote.waitingTitle}
            </p>
            <p className="mt-3 text-xs text-muted">{d.promote.toPay}</p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
              <p className="text-[clamp(2.4rem,7vw,3.6rem)] leading-none font-light tracking-tight tabular-nums">
                {formatUzs(pending.amountUzs)} <span className="text-lg text-muted">{d.common.uzs}</span>
              </p>
              <CopyButton text={String(pending.amountUzs)} label={d.common.copy} done={d.common.copied} />
            </div>
            {pending.payCode > 0 && (
              <p className="mt-2 text-sm text-muted">{fmt(d.promote.codeLine, { price: formatUzs(pending.amountUzs - pending.payCode), code: pending.payCode })}</p>
            )}
            <p className="mt-6 max-w-2xl leading-relaxed">{d.promote.waitingText}</p>
            {pending.payCode > 0 && <p className="mt-2 max-w-2xl text-sm text-muted">{fmt(d.promote.exact, { code: pending.payCode })}</p>}
          </div>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {cards.map((c, i) => (
              <PaymentCardView
                key={c.type + c.number}
                card={c}
                index={i}
                holderLabel={d.promote.holder}
                copyLabel={d.common.copy}
                copiedLabel={d.common.copied}
              />
            ))}
          </div>

          <p className="flex items-center gap-2 text-xs text-muted">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {fmt(d.promote.expires, { date: formatDate(new Date(pending.createdAt.getTime() + PENDING_TTL_MS), locale) })}
          </p>

          {/* Zaxira: avtomatik tasdiqlanmasa — chek */}
          <details className="card group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
              {pending.receiptKey ? d.promote.receiptSent : d.promote.receiptOptional}
              <span className="text-muted transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm text-muted">{d.promote.receiptHint}</p>
            <ActionForm action={attachReceipt} resetOnSuccess className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <Field label={d.promote.receipt}>
                <input name="receipt" type="file" required accept="image/jpeg,image/png,image/webp" className="input" />
              </Field>
              <Field label={`${d.promote.payerNote} (${d.common.optional})`}>
                <input name="payerNote" maxLength={200} placeholder={d.promote.payerNotePh} className="input" />
              </Field>
              <SubmitButton variant="ghost">{d.promote.sendReceipt}</SubmitButton>
            </ActionForm>
          </details>

          <ActionForm action={cancelPayment} confirmText={`${d.promote.cancel}?`}>
            <SubmitButton variant="ghost" size="sm">
              {d.promote.cancel}
            </SubmitButton>
          </ActionForm>
        </section>
      ) : (
        /* 1-qadam: tarif — bitta tugma */
        <section className={cn("grid gap-3", plans.length > 1 && "md:grid-cols-2")}>
          {plans.map((p) => {
            const slot = slots.get(p.id)!;
            return (
              <div key={p.id} className="card p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted">
                    {d.promote.choose}: {p.name}
                  </span>
                  {p.slots > 0 && (
                    <span className="chip">
                      <Users className="h-3 w-3" />
                      {slot.full ? d.promote.slotsFull : fmt(d.promote.slotsFree, { free: p.slots - slot.used, slots: p.slots })}
                    </span>
                  )}
                </div>
                <div className="mt-6 text-[clamp(2.6rem,7vw,4rem)] leading-none font-light tracking-tight">
                  {formatUzs(p.priceUzs)} <span className="text-lg text-muted">{d.common.uzs}</span>
                </div>
                <p className="mt-2 text-muted">/ {fmt(d.promo.perDays, { days: p.days })}</p>
                <ul className="my-6 grid gap-2.5 text-sm sm:grid-cols-2">
                  {d.promo.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0" /> {f}
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 shrink-0" /> {fmt(d.promo.rotation, { m })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-4 w-4 shrink-0" /> {d.promo.auto}
                  </li>
                </ul>
                {slot.full ? (
                  <p className="rounded-xl border border-line px-4 py-3 text-sm">
                    {d.promote.full}
                    {slot.nextFree && (
                      <span className="block text-muted">{fmt(d.promote.slotsNext, { date: formatDate(slot.nextFree, locale) })}</span>
                    )}
                  </p>
                ) : (
                  <ActionForm action={startPayment} className="space-y-3">
                    <input type="hidden" name="planId" value={p.id} />
                    <SubmitButton size="lg" className="w-full sm:w-auto">
                      {fmt(d.promote.start, { price: formatUzs(p.priceUzs) })}
                    </SubmitButton>
                    <p className="text-xs text-muted">{d.promote.startHint}</p>
                  </ActionForm>
                )}
              </div>
            );
          })}
          <p className="flex items-center gap-2 text-xs text-muted">
            <Repeat className="h-3.5 w-3.5 shrink-0" /> {fmt(d.promote.rotation, { m })}
          </p>
        </section>
      )}

      <details className="card p-5 text-sm">
        <summary className="cursor-pointer font-medium">{fmt(d.promote.codeTitle, { code: pending?.payCode || "100–999" })}</summary>
        <p className="mt-2 leading-relaxed text-muted">{fmt(d.promote.codeText, { code: pending?.payCode || "100–999" })}</p>
      </details>

      <section>
        <h2 className="mb-3 text-lg font-medium">{d.promote.history}</h2>
        {history.some((h) => h.payCode > 0) && <p className="-mt-1 mb-3 text-xs text-muted">{d.promote.historyNote}</p>}
        {history.length === 0 ? (
          <p className="text-sm text-muted">{d.promote.noHistory}</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {h.planName} · {fmt(d.promo.perDays, { days: h.days })}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDate(h.createdAt, locale)}
                    {h.adminNote ? ` · ${h.adminNote}` : ""}
                  </p>
                </div>
                {h.receiptKey && (
                  <a href={`/api/files/${h.receiptKey}`} target="_blank" rel="noopener" className="text-xs underline">
                    {d.promote.receipt}
                  </a>
                )}
                <span className="text-right text-sm">
                  {formatUzs(h.amountUzs)} {d.common.uzs}
                  {h.payCode > 0 && (
                    <span className="block text-xs text-muted">
                      {fmt(d.promote.historyCode, { price: formatUzs(h.amountUzs - h.payCode), code: h.payCode })}
                    </span>
                  )}
                </span>
                <StatusBadge status={h.status} label={d.promote.status[h.status]} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
