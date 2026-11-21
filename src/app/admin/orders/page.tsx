import { requireAdmin } from "@/lib/auth/current";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { adminCancelOrder } from "@/actions/admin";
import { AdminHead, FilterTabs, shortDay, Table } from "@/components/admin-bits";
import { ActionForm, SubmitButton } from "@/components/form";
import { StatusBadge } from "@/components/page-bits";
import { db } from "@/db";
import { editorProfiles, orders, users } from "@/db/schema";

export const dynamic = "force-dynamic";
const STATUSES = ["OPEN", "PENDING", "IN_PROGRESS", "DELIVERED", "COMPLETED", "CANCELLED"] as const;
const LABEL: Record<string, string> = {
  OPEN: "Ochiq",
  PENDING: "Javob kutilmoqda",
  IN_PROGRESS: "Jarayonda",
  DELIVERED: "Topshirilgan",
  COMPLETED: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const rows = await db
    .select({ o: orders, client: users.email, editor: editorProfiles.displayName })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.clientId))
    .leftJoin(editorProfiles, eq(editorProfiles.id, orders.editorId))
    .where(status ? eq(orders.status, status) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(150);

  return (
    <>
      <AdminHead
        title="Buyurtmalar"
        text="Mijozlar montajorlarga bergan ishlar. Odatda aralashish shart emas — faqat muammo bo'lsa (aldov, nizo, spam) buyurtmani bekor qilasiz."
      />
      <FilterTabs base="/admin/orders" current={status} items={[{ label: "Barchasi" }, ...STATUSES.map((s) => ({ value: s, label: LABEL[s] }))]} />
      <Table head={["Buyurtma", "Mijoz / Montajor", "Narx", "Muddat", "Holat", ""]} empty={rows.length === 0}>
        {rows.map(({ o, client, editor }) => (
          <tr key={o.id} className="align-top">
            <td className="max-w-xs px-4 py-3">
              <Link href={`/orders/${o.id}`} className="font-medium hover:underline hover:underline-offset-4">
                {o.title}
              </Link>
              <p className="text-xs text-muted">
                {o.isPublic ? "Hammaga ochiq" : "Montajorga to'g'ridan-to'g'ri"} · {o.proposalCount} ta taklif
              </p>
            </td>
            <td className="px-4 py-3 text-xs">
              <span className="text-muted">Mijoz:</span> {client}
              <p>
                <span className="text-muted">Montajor:</span> {editor ?? "—"}
              </p>
            </td>
            <td className="px-4 py-3">${o.agreedPriceUsd ?? o.budgetUsd}</td>
            <td className="px-4 py-3 text-xs text-muted">{shortDay(o.deadline)}</td>
            <td className="px-4 py-3">
              <StatusBadge status={o.status} label={LABEL[o.status]} />
              {o.cancelReason && <p className="mt-1 text-xs text-muted">{o.cancelReason}</p>}
            </td>
            <td className="px-4 py-3">
              {o.status !== "COMPLETED" && o.status !== "CANCELLED" && (
                <ActionForm action={adminCancelOrder.bind(null, o.id)} confirmText="Buyurtma bekor qilinsinmi?" className="flex gap-1">
                  <input name="reason" placeholder="Sabab" maxLength={200} className="input !h-8 w-28 !px-2 text-xs" />
                  <SubmitButton size="sm" variant="ghost" className="!h-8 text-xs">
                    Bekor
                  </SubmitButton>
                </ActionForm>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
