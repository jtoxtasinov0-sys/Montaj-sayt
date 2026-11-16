import { requireAdmin } from "@/lib/auth/current";
import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminStat } from "@/components/admin-bits";
import { db } from "@/db";
import { auditLogs, editorProfiles, orders, payments, reviews, users } from "@/db/schema";
import { telegramEnabled } from "@/lib/telegram";
import { formatUzs } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const [[u], [e], [o], [p], [r], logs] = await Promise.all([
    db
      .select({
        n: sql<number>`count(*)::int`,
        week: sql<number>`count(*) filter (where ${users.createdAt} > now() - interval '7 days')::int`,
        banned: sql<number>`count(*) filter (where ${users.status} = 'BANNED')::int`,
      })
      .from(users),
    db
      .select({
        n: sql<number>`count(*)::int`,
        boosted: sql<number>`count(*) filter (where ${editorProfiles.boostUntil} > now() and ${editorProfiles.boostWeight} > 0)::int`,
      })
      .from(editorProfiles),
    db
      .select({
        open: sql<number>`count(*) filter (where ${orders.status} = 'OPEN')::int`,
        active: sql<number>`count(*) filter (where ${orders.status} in ('PENDING','IN_PROGRESS','DELIVERED'))::int`,
        done: sql<number>`count(*) filter (where ${orders.status} = 'COMPLETED')::int`,
      })
      .from(orders),
    db
      .select({
        pending: sql<number>`count(*) filter (where ${payments.status} = 'PENDING')::int`,
        month: sql<number>`coalesce(sum(${payments.amountUzs}) filter (where ${payments.status} = 'APPROVED' and ${payments.createdAt} > date_trunc('month', now())), 0)::int`,
        total: sql<number>`coalesce(sum(${payments.amountUzs}) filter (where ${payments.status} = 'APPROVED'), 0)::bigint`,
      })
      .from(payments),
    db.select({ n: sql<number>`count(*)::int`, avg: sql<number>`coalesce(avg(${reviews.rating}),0)::float` }).from(reviews),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(12),
  ]);
  const recentPending = await db
    .select({ id: payments.id, plan: payments.planName, amount: payments.amountUzs, name: editorProfiles.displayName, createdAt: payments.createdAt })
    .from(payments)
    .innerJoin(editorProfiles, eq(editorProfiles.id, payments.editorId))
    .where(eq(payments.status, "PENDING"))
    .orderBy(desc(payments.createdAt))
    .limit(5);

  return (
    <div className="space-y-8">
      {!telegramEnabled() && (
        <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm">
          Telegram bot ulanmagan. <Link href="/admin/settings" className="underline">Sozlamalar</Link> bo&apos;limiga qarang.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStat label="Kutilayotgan to'lovlar" value={p.pending} tone={p.pending ? "accent" : undefined} />
        <AdminStat label="Shu oy tushum" value={`${formatUzs(p.month)} so'm`} hint={`Jami: ${formatUzs(Number(p.total))} so'm`} tone="success" />
        <AdminStat label="Foydalanuvchilar" value={u.n} hint={`+${u.week} shu hafta · ${u.banned} bloklangan`} />
        <AdminStat label="Montajorlar" value={e.n} hint={`${e.boosted} ta TOP'da`} tone="primary" />
        <AdminStat label="Ochiq buyurtmalar" value={o.open} />
        <AdminStat label="Jarayonda" value={o.active} />
        <AdminStat label="Yakunlangan" value={o.done} />
        <AdminStat label="Baholar" value={r.n} hint={`O'rtacha ${r.avg.toFixed(2)}★`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Kutilayotgan to&apos;lovlar</h2>
            <Link href="/admin/payments" className="text-xs text-primary-2">
              Barchasi →
            </Link>
          </div>
          {recentPending.length === 0 ? (
            <p className="text-sm text-muted">Yo&apos;q ✅</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {recentPending.map((x) => (
                <li key={x.id} className="flex justify-between gap-3 py-2.5">
                  <span>
                    {x.name} — <span className="text-muted">{x.plan}</span>
                  </span>
                  <span>{formatUzs(x.amount)} so&apos;m</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">So&apos;nggi harakatlar</h2>
            <Link href="/admin/audit" className="text-xs text-primary-2">
              Barchasi →
            </Link>
          </div>
          <ul className="divide-y divide-line text-xs">
            {logs.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 py-2">
                <span className="truncate">
                  <span className="text-primary-2">{l.action}</span> · {l.actorLabel}
                </span>
                <span className="shrink-0 text-muted">{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
