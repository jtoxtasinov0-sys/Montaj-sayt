import { ArrowRight, Clock, Flame, Gauge, Plus, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { OrderRow } from "@/components/order-row";
import { Neon } from "@/components/motion";
import { Empty } from "@/components/page-bits";
import { getEditorProfileByUser, requireUser } from "@/lib/auth/current";
import { myClientOrders, myEditorOrders } from "@/lib/dashboard-data";
import { fmt, getDict, getLocale } from "@/lib/i18n";
import { daysLeft } from "@/lib/utils";

export default async function DashboardHome() {
  const user = await requireUser();
  const [d, locale, editor, clientOrders] = await Promise.all([getDict(), getLocale(), getEditorProfileByUser(user.id), myClientOrders(user.id, 5)]);
  const editorOrders = editor ? await myEditorOrders(editor.id, 5) : [];
  const boosted = editor && editor.boostWeight > 0 && editor.boostUntil && editor.boostUntil > new Date();

  return (
    <div className="space-y-8">
      {editor ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { icon: Star, v: editor.ratingCount ? editor.ratingAvg.toFixed(1) : "—", l: fmt(d.editors.reviews, { n: editor.ratingCount }) },
            { icon: Trophy, v: editor.completedOrders, l: d.stats.completed },
            {
              icon: Clock,
              v: editor.completedOrders ? `${Math.round((editor.onTimeOrders / editor.completedOrders) * 100)}%` : "—",
              l: d.rating.onTime,
            },
            { icon: Gauge, v: editor.score.toFixed(1), l: d.dashboard.score },
          ].map((s) => (
            <div key={s.l} className="card p-5">
              <s.icon className="h-5 w-5 text-primary-2" />
              <div className="mt-3 text-3xl font-light tracking-tight">{s.v}</div>
              <div className="text-xs text-muted">{s.l}</div>
            </div>
          ))}
          <Link href="/dashboard/promote" className="card relative flex flex-col justify-between p-5">
            {boosted && <Neon tone="accent" />}
            <Flame className={`h-5 w-5 ${boosted ? "text-accent" : "text-muted"}`} />
            <p className="mt-3 text-sm">
              {boosted ? fmt(d.dashboard.boostActive, { plan: "TOP", days: daysLeft(editor.boostUntil!) }) : d.dashboard.boostNone}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary-2">
              {d.nav.top} <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
      ) : (
        <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-medium">{d.dashboard.becomeTitle}</h2>
            <p className="mt-1 text-sm text-muted">{d.dashboard.becomeText}</p>
          </div>
          <Link href="/dashboard/profile" className="btn btn-primary">
            {d.dashboard.becomeCta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* min-w-0: uzun sarlavhali qatorlar mobil ekranni kengaytirib yubormasin */}
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">{d.dashboard.asClient}</h2>
            <Link href="/orders/new" className="btn btn-ghost btn-sm">
              <Plus className="h-4 w-4" /> {d.nav.postJob}
            </Link>
          </div>
          <div className="space-y-2">
            {clientOrders.length === 0 ? (
              <Empty>{d.dashboard.noOrders}</Empty>
            ) : (
              clientOrders.map((o) => <OrderRow key={o.id} o={o} d={d} locale={locale} who={o.editorName} />)
            )}
          </div>
        </section>
        {editor && (
          <section className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium">{d.dashboard.asEditor}</h2>
              <Link href={`/editors/${editor.slug}`} className="btn btn-ghost btn-sm">
                {d.dashboard.viewProfile}
              </Link>
            </div>
            <div className="space-y-2">
              {editorOrders.length === 0 ? (
                <Empty>
                  {d.dashboard.noOrders}{" "}
                  <Link href="/jobs" className="mt-2 text-primary-2 underline">
                    {d.nav.jobs}
                  </Link>
                </Empty>
              ) : (
                editorOrders.map((o) => <OrderRow key={o.id} o={o} d={d} locale={locale} who={o.clientName} />)
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
