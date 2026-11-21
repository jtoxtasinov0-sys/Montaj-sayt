import { requireAdmin } from "@/lib/auth/current";
import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { adminApprovePayment, adminRejectPayment } from "@/actions/admin";
import { AdminHead, FilterTabs, shortDate } from "@/components/admin-bits";
import { ActionForm, SubmitButton } from "@/components/form";
import { Empty, StatusBadge } from "@/components/page-bits";
import { db } from "@/db";
import { editorProfiles, payments, users } from "@/db/schema";
import { formatUzs } from "@/lib/utils";

export const dynamic = "force-dynamic";
const LABEL = { PENDING: "Kutilmoqda", APPROVED: "Tasdiqlangan", REJECTED: "Rad etilgan / bekor" } as const;

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const sp = await searchParams;
  const status = (["PENDING", "APPROVED", "REJECTED"] as const).find((s) => s === sp.status);
  const [rows, [n]] = await Promise.all([
    db
      .select({ p: payments, email: users.email, name: editorProfiles.displayName, slug: editorProfiles.slug })
      .from(payments)
      .innerJoin(users, eq(users.id, payments.userId))
      .innerJoin(editorProfiles, eq(editorProfiles.id, payments.editorId))
      .where(status ? eq(payments.status, status) : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(100),
    db
      .select({
        all: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${payments.status} = 'PENDING')::int`,
        approved: sql<number>`count(*) filter (where ${payments.status} = 'APPROVED')::int`,
        rejected: sql<number>`count(*) filter (where ${payments.status} = 'REJECTED')::int`,
      })
      .from(payments),
  ]);

  return (
    <>
      <AdminHead
        title="To'lovlar"
        text="Montajorlar TOP uchun qilgan to'lovlar. Har biriga shaxsiy summa beriladi (narx + kod): bank xabari kelsa o'zi tasdiqlanadi. Chek yuborilgan, lekin avtomatik tasdiqlanmagan to'lovni bankdagi summa bilan solishtirib, o'zingiz tasdiqlaysiz."
      />
      <FilterTabs
        base="/admin/payments"
        current={status}
        items={[
          { label: "Barchasi", count: n.all },
          { value: "PENDING", label: "Kutilmoqda", count: n.pending },
          { value: "APPROVED", label: "Tasdiqlangan", count: n.approved },
          { value: "REJECTED", label: "Rad etilgan", count: n.rejected },
        ]}
      />
      {rows.length === 0 && <Empty className="card-solid">To&apos;lovlar yo&apos;q</Empty>}
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map(({ p, email, name, slug }) => (
          <article key={p.id} className="card card-solid flex gap-4 p-4 sm:p-5">
            {p.receiptKey ? (
              <a href={`/api/files/${p.receiptKey}`} target="_blank" rel="noopener" className="shrink-0" title="Chekni kattalashtirish">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${p.receiptKey}`}
                  alt="Chek"
                  className="h-28 w-20 rounded-xl border border-line object-cover sm:h-36 sm:w-28"
                  loading="lazy"
                />
              </a>
            ) : (
              // Chek yo'q: to'lov bank xabaridan avtomatik tasdiqlanadi (yoki muddati o'tib bekor bo'ladi)
              <span className="grid h-28 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-line-strong p-2 text-center text-[0.68rem] leading-tight text-muted sm:h-36 sm:w-28">
                Chek yo&apos;q — bank xabarini kutadi
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-1.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/editors/${slug}`} className="truncate font-medium hover:underline hover:underline-offset-4">
                  {name}
                </Link>
                <StatusBadge status={p.status} label={LABEL[p.status]} />
              </div>
              <p className="truncate text-xs text-muted">{email}</p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                <b className="text-xl font-light tabular-nums">{formatUzs(p.amountUzs)} so&apos;m</b>
                {p.payCode > 0 && (
                  <span className="chip" title="To'lov kodi: bankdagi summaning oxirgi raqamlari">
                    kod {p.payCode}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted">
                {p.planName} · {p.days} kun · {p.method} · {shortDate(p.createdAt)}
              </p>
              {p.payerNote && <p className="text-xs text-muted">Izoh: “{p.payerNote}”</p>}
              {p.reviewedBy && (
                <p className="text-xs text-muted">
                  Ko&apos;rib chiqdi: {p.reviewedBy}
                  {p.adminNote && ` — ${p.adminNote}`}
                </p>
              )}
              {p.status === "PENDING" && (
                <div className="space-y-2 border-t border-line pt-3">
                  <ActionForm action={adminApprovePayment.bind(null, p.id)} confirmText="Tasdiqlaysizmi? TOP darhol yoqiladi.">
                    <SubmitButton size="sm" className="w-full">
                      ✓ Pul tushdi — tasdiqlash
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm action={adminRejectPayment.bind(null, p.id)} className="flex gap-2">
                    <input name="reason" placeholder="Rad etish sababi (ixtiyoriy)" maxLength={300} className="input !h-9 min-w-0 flex-1 text-sm" />
                    <SubmitButton size="sm" variant="ghost">
                      Rad etish
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
