import { requireAdmin } from "@/lib/auth/current";
import { asc, desc, eq, sql } from "drizzle-orm";
import { ClipboardList, Clapperboard, CreditCard, Flame, Loader, Star, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { AdminHead, AdminStat, auditLabel, PanelTitle, shortDate } from "@/components/admin-bits";
import { db } from "@/db";
import { auditLogs, editorProfiles, orders, payments, promotionPlans, reviews, users } from "@/db/schema";
import { telegramEnabled } from "@/lib/telegram";
import { formatUzs } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const [[u], [e], [o], [p], [r], logs, [plan]] = await Promise.all([
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
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10),
    db.select().from(promotionPlans).orderBy(asc(promotionPlans.sort), asc(promotionPlans.id)).limit(1),
  ]);
  const recentPending = await db
    .select({ id: payments.id, amount: payments.amountUzs, name: editorProfiles.displayName, createdAt: payments.createdAt })
    .from(payments)
    .innerJoin(editorProfiles, eq(editorProfiles.id, payments.editorId))
    .where(eq(payments.status, "PENDING"))
    .orderBy(desc(payments.createdAt))
    .limit(5);

  return (
    <div className="space-y-8">
      <AdminHead title="Umumiy holat" text="Saytdagi asosiy raqamlar. Kartaga bossangiz — o'sha bo'lim ochiladi." />

      <div className="space-y-3 empty:hidden">
        {p.pending > 0 && (
          <Link
            href="/admin/payments?status=PENDING"
            className="card card-solid flex flex-wrap items-center gap-4 p-5 transition duration-300 hover:-translate-y-0.5"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
            </span>
            <p className="flex-1 text-sm">
              <b className="font-medium">{p.pending} ta to&apos;lov tasdiq kutmoqda.</b>{" "}
              <span className="text-muted">Bank xabari kelsa o&apos;zi tasdiqlanadi, chek yuborilgan bo&apos;lsa — siz tekshirasiz.</span>
            </p>
            <span className="btn btn-primary btn-sm">Tekshirish →</span>
          </Link>
        )}

        {!telegramEnabled() && (
          <div className="card card-solid p-5 text-sm">
            <b className="font-medium">Telegram bot ulanmagan</b>
            <span className="text-muted"> — yangi to&apos;lovlar haqida xabar kelmaydi. </span>
            <Link href="/admin/settings" className="underline underline-offset-4">
              Sozlamalar
            </Link>
            <span className="text-muted"> bo&apos;limida ulang.</span>
          </div>
        )}
      </div>

      <section>
        <p className="eyebrow mb-3">Pul va TOP</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminStat
            label="Tasdiq kutayotgan to'lovlar"
            value={p.pending}
            icon={<CreditCard />}
            alert={p.pending > 0}
            href="/admin/payments?status=PENDING"
          />
          <AdminStat
            label="Shu oydagi tushum"
            value={`${formatUzs(p.month)}`}
            hint={`so'm · jami ${formatUzs(Number(p.total))} so'm`}
            icon={<Wallet />}
            href="/admin/payments?status=APPROVED"
          />
          <AdminStat
            label="Hozir TOP'da"
            value={plan?.slots ? `${e.boosted} / ${plan.slots}` : e.boosted}
            hint={plan ? `${formatUzs(plan.priceUzs)} so'm · ${plan.days} kun` : "Tarif sozlanmagan"}
            icon={<Flame />}
            href="/admin/plans"
          />
          <AdminStat label="Montajorlar" value={e.n} hint="Profil ochganlar" icon={<Clapperboard />} href="/admin/editors" />
        </div>
      </section>

      <section>
        <p className="eyebrow mb-3">Sayt faolligi</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminStat
            label="Foydalanuvchilar"
            value={u.n}
            hint={`+${u.week} shu hafta · ${u.banned} bloklangan`}
            icon={<Users />}
            href="/admin/users"
          />
          <AdminStat
            label="Ochiq buyurtmalar"
            value={o.open}
            hint="Montajor qidirilmoqda"
            icon={<ClipboardList />}
            href="/admin/orders?status=OPEN"
          />
          <AdminStat
            label="Ish jarayonida"
            value={o.active}
            hint={`${o.done} ta yakunlangan`}
            icon={<Loader />}
            href="/admin/orders?status=IN_PROGRESS"
          />
          <AdminStat label="Baholar" value={r.n} hint={r.n ? `O'rtacha ${r.avg.toFixed(1)} ★` : "Hali yo'q"} icon={<Star />} href="/admin/reviews" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-solid p-5 sm:p-6">
          <PanelTitle title="Tasdiq kutayotgan to'lovlar" text="Eng yangilari" href="/admin/payments?status=PENDING" />
          {recentPending.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
              Hammasi ko&apos;rib chiqilgan ✓
            </p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {recentPending.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{x.name}</span>
                    <span className="text-xs text-muted">{shortDate(x.createdAt)}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatUzs(x.amount)} so&apos;m</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card card-solid p-5 sm:p-6">
          <PanelTitle title="So'nggi harakatlar" text="Kim nima qildi" href="/admin/audit" />
          {logs.length === 0 && (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
              Hozircha harakatlar yo&apos;q
            </p>
          )}
          <ul className="divide-y divide-line text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate">{auditLabel(l.action)}</span>
                  <span className="block truncate text-xs text-muted">{l.actorLabel}</span>
                </span>
                <span className="shrink-0 text-xs text-muted tabular-nums">{shortDate(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
