import { requireAdmin } from "@/lib/auth/current";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { adminApprovePayment, adminRejectPayment } from "@/actions/admin";
import { FilterTabs } from "@/components/admin-bits";
import { ActionForm, SubmitButton } from "@/components/form";
import { StatusBadge } from "@/components/page-bits";
import { db } from "@/db";
import { editorProfiles, payments, users } from "@/db/schema";
import { formatUzs } from "@/lib/utils";

export const dynamic = "force-dynamic";
const LABEL = { PENDING: "Kutilmoqda", APPROVED: "Tasdiqlangan", REJECTED: "Rad etilgan" } as const;

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const sp = await searchParams;
  const status = (["PENDING", "APPROVED", "REJECTED"] as const).find((s) => s === sp.status);
  const rows = await db
    .select({ p: payments, email: users.email, name: editorProfiles.displayName, slug: editorProfiles.slug })
    .from(payments)
    .innerJoin(users, eq(users.id, payments.userId))
    .innerJoin(editorProfiles, eq(editorProfiles.id, payments.editorId))
    .where(status ? eq(payments.status, status) : undefined)
    .orderBy(desc(payments.createdAt))
    .limit(100);

  return (
    <>
      <FilterTabs
        base="/admin/payments"
        current={status}
        items={[{ label: "Barchasi" }, { value: "PENDING", label: "Kutilmoqda" }, { value: "APPROVED", label: "Tasdiqlangan" }, { value: "REJECTED", label: "Rad etilgan" }]}
      />
      {rows.length === 0 && <p className="card p-8 text-center text-sm text-muted">To&apos;lovlar yo&apos;q</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map(({ p, email, name, slug }) => (
          <article key={p.id} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
            <a href={`/api/files/${p.receiptKey}`} target="_blank" rel="noopener" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${p.receiptKey}`} alt="Chek" className="h-28 w-20 rounded-xl border border-line object-cover sm:h-36 sm:w-28" loading="lazy" />
            </a>
            <div className="min-w-0 flex-1 space-y-1.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/editors/${slug}`} className="font-medium hover:text-primary-2">
                  {name}
                </Link>
                <StatusBadge status={p.status} label={LABEL[p.status]} />
              </div>
              <p className="truncate text-xs text-muted">{email}</p>
              <p>
                <b className="text-lg font-light">{formatUzs(p.amountUzs)} so&apos;m</b>
                {p.payCode > 0 && (
                  <span className="chip chip-primary ml-2 align-middle" title="To'lov kodi: bankdagi summaning oxirgi raqamlari">
                    kod {p.payCode}
                  </span>
                )}{" "}
                · TOP {p.planName} · {p.days} kun
              </p>
              <p className="text-xs text-muted">
                {p.method} · {p.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                {p.payerNote && ` · “${p.payerNote}”`}
              </p>
              {p.reviewedBy && (
                <p className="text-xs text-muted">
                  {p.reviewedBy}
                  {p.adminNote && ` — ${p.adminNote}`}
                </p>
              )}
              {p.status === "PENDING" && (
                <div className="flex flex-wrap items-start gap-2 pt-2">
                  <ActionForm action={adminApprovePayment.bind(null, p.id)} confirmText="Tasdiqlaysizmi? TOP darhol faollashadi.">
                    <SubmitButton size="sm">✅ Tasdiqlash</SubmitButton>
                  </ActionForm>
                  <ActionForm action={adminRejectPayment.bind(null, p.id)} className="flex flex-1 gap-2">
                    <input name="reason" placeholder="Rad etish sababi" maxLength={300} className="input !h-9 min-w-0 flex-1 text-sm" />
                    <SubmitButton size="sm" variant="ghost">
                      ❌
                    </SubmitButton>
                  </ActionForm>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
