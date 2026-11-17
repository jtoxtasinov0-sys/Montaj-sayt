import { CreditCard, Flame, Info } from "lucide-react";
import { redirect } from "next/navigation";
import { submitPayment } from "@/actions/payments";
import { ActionForm, CopyButton, SubmitButton } from "@/components/form";
import { Neon } from "@/components/motion";
import { Field, StatusBadge } from "@/components/page-bits";
import { getEditorProfileByUser, requireUser } from "@/lib/auth/current";
import { myPayments } from "@/lib/dashboard-data";
import { getPaymentCards, getPlans } from "@/lib/data";
import { fmt, getDict, getLocale } from "@/lib/i18n";
import { cn, daysLeft, formatDate, formatUzs } from "@/lib/utils";

export default async function PromotePage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const user = await requireUser("/dashboard/promote");
  const editor = await getEditorProfileByUser(user.id);
  if (!editor) redirect("/dashboard/profile");
  const sp = await searchParams;
  const [d, locale, plans, cards, history] = await Promise.all([getDict(), getLocale(), getPlans(), getPaymentCards(), myPayments(user.id)]);
  const pre = Number(sp.plan) || plans.find((p) => p.isPopular)?.id || plans[0]?.id;
  const boosted = editor.boostWeight > 0 && editor.boostUntil && editor.boostUntil > new Date();
  const hasPending = history.some((h) => h.status === "PENDING");

  return (
    <div className="space-y-8">
      <div className="card relative flex flex-wrap items-center gap-4 p-5">
        {boosted && <Neon tone="accent" />}
        <span className={cn("grid h-11 w-11 place-items-center rounded-2xl", boosted ? "bg-accent/15 text-accent" : "bg-card-2 text-muted")}>
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

      <ActionForm action={submitPayment} resetOnSuccess className="space-y-6">
        {/* 1. Reja */}
        <section>
          <h2 className="mb-3 flex items-center gap-3 text-lg font-medium">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs text-white">1</span>
            {d.promote.choose}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((p) => (
              <label
                key={p.id}
                className="card relative cursor-pointer p-5 transition has-[:checked]:border-primary-2 has-[:checked]:bg-primary/10 has-[:checked]:shadow-[0_0_0_1px_var(--primary-2)]"
              >
                <input type="radio" name="planId" value={p.id} defaultChecked={p.id === pre} required className="sr-only" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">{p.name}</span>
                  {p.isPopular && <span className="chip chip-accent">{d.promo.popular}</span>}
                </div>
                <div className="mt-3 text-3xl font-light tracking-tight">
                  {formatUzs(p.priceUzs)} <span className="text-sm text-muted">{d.common.uzs}</span>
                </div>
                <div className="text-sm text-muted">{fmt(d.promo.perDays, { days: p.days })}</div>
              </label>
            ))}
          </div>
        </section>

        {/* 2. Karta */}
        <section>
          <h2 className="mb-3 flex items-center gap-3 text-lg font-medium">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs text-white">2</span>
            {d.promote.step1}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {cards.map((c, i) => (
              <label
                key={c.type + c.number}
                className="relative block cursor-pointer overflow-hidden rounded-3xl border border-line p-5 transition has-[:checked]:border-primary-2 has-[:checked]:shadow-[0_0_0_1px_var(--primary-2)]"
                style={{
                  background:
                    c.type === "VISA"
                      ? "linear-gradient(135deg,#1b1f5e 0%,#3d4ce4 60%,#7d86ff 100%)"
                      : "linear-gradient(135deg,#0d3b2e 0%,#138a5e 60%,#45c08a 100%)",
                }}
              >
                <input type="radio" name="method" value={c.type} defaultChecked={i === 0} required className="sr-only" />
                <div className="flex items-center justify-between text-white">
                  <span className="text-sm font-semibold tracking-widest">{c.type}</span>
                  <CreditCard className="h-6 w-6 opacity-80" />
                </div>
                <p className="mt-8 font-mono text-xl tracking-[0.12em] text-white sm:text-2xl">{c.number}</p>
                <div className="mt-4 flex items-end justify-between gap-3 text-white/80">
                  <div className="text-xs">
                    <p className="opacity-70">{d.promote.holder}</p>
                    <p className="font-medium text-white">{c.holder}</p>
                    {c.bank && <p className="opacity-70">{c.bank}</p>}
                  </div>
                  <div className="dark">
                    <CopyButton text={c.number} label={d.common.copy} done={d.common.copied} />
                  </div>
                </div>
              </label>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Info className="h-3.5 w-3.5" /> {d.promote.testNotice}
          </p>
        </section>

        {/* 3. Chek */}
        <section className="card space-y-4 p-6">
          <h2 className="flex items-center gap-3 text-lg font-medium">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs text-white">3</span>
            {d.promote.step2}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={d.promote.receipt} hint={d.promote.receiptHint}>
              <input name="receipt" type="file" required accept="image/jpeg,image/png,image/webp" className="input" />
            </Field>
            <Field label={`${d.promote.payerNote} (${d.common.optional})`}>
              <input name="payerNote" maxLength={200} placeholder={d.promote.payerNotePh} className="input" />
            </Field>
          </div>
          {hasPending ? (
            <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">{d.errors.pendingPayment}</p>
          ) : (
            <SubmitButton size="lg">{d.promote.submit}</SubmitButton>
          )}
        </section>
      </ActionForm>

      <section>
        <h2 className="mb-3 text-lg font-medium">{d.promote.history}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">{d.promote.noHistory}</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    TOP {h.planName} · {fmt(d.promo.perDays, { days: h.days })}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDate(h.createdAt, locale)} · {h.method}
                    {h.adminNote ? ` · ${h.adminNote}` : ""}
                  </p>
                </div>
                <a href={`/api/files/${h.receiptKey}`} target="_blank" rel="noopener" className="text-xs text-primary-2 underline">
                  {d.promote.receipt.split(" ")[0]}
                </a>
                <span className="text-sm">
                  {formatUzs(h.amountUzs)} {d.common.uzs}
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
