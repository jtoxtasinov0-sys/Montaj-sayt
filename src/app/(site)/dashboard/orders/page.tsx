import Link from "next/link";
import { OrderRow } from "@/components/order-row";
import { Empty, StatusBadge } from "@/components/page-bits";
import { getEditorProfileByUser, requireUser } from "@/lib/auth/current";
import { myClientOrders, myEditorOrders, myProposals } from "@/lib/dashboard-data";
import { fmt, getDict, getLocale } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export default async function DashboardOrders() {
  const user = await requireUser("/dashboard/orders");
  const [d, locale, editor, clientOrders] = await Promise.all([getDict(), getLocale(), getEditorProfileByUser(user.id), myClientOrders(user.id)]);
  const [editorOrders, proposalsList] = editor ? await Promise.all([myEditorOrders(editor.id), myProposals(editor.id)]) : [[], []];

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section>
        <h2 className="mb-3 text-lg font-medium">{d.dashboard.asClient}</h2>
        <div className="space-y-2">
          {clientOrders.length === 0 ? (
            <Empty>{d.dashboard.noOrders}</Empty>
          ) : (
            clientOrders.map((o) => <OrderRow key={o.id} o={o} d={d} locale={locale} who={o.editorName ?? fmt(d.jobs.proposals, { n: o.proposalCount })} />)
          )}
        </div>
      </section>
      {editor && (
        <section className="space-y-10">
          <div>
            <h2 className="mb-3 text-lg font-medium">{d.dashboard.asEditor}</h2>
            <div className="space-y-2">
              {editorOrders.length === 0 ? (
                <Empty>{d.dashboard.noOrders}</Empty>
              ) : (
                editorOrders.map((o) => <OrderRow key={o.id} o={o} d={d} locale={locale} who={o.clientName} />)
              )}
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-medium">{d.dashboard.myProposals}</h2>
            <div className="space-y-2">
              {proposalsList.length === 0 ? (
                <Empty>
                  <Link href="/jobs" className="text-primary-2 underline">
                    {d.nav.jobs}
                  </Link>
                </Empty>
              ) : (
                proposalsList.map((p) => (
                  <Link
                    key={p.id}
                    href={`/orders/${p.orderId}`}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3.5 hover:border-line-strong sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.orderTitle}</p>
                      <p className="text-xs text-muted">
                        ${p.priceUsd} · {fmt(d.profile.delivery, { n: p.days })} · {formatDate(p.createdAt, locale)}
                      </p>
                      <StatusBadge status={p.orderStatus} label={d.orderStatus[p.orderStatus]} className="mt-2 sm:hidden" />
                    </div>
                    <StatusBadge status={p.orderStatus} label={d.orderStatus[p.orderStatus]} className="max-sm:hidden" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
