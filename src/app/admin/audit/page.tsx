import { requireAdmin } from "@/lib/auth/current";
import { desc } from "drizzle-orm";
import { AdminHead, auditLabel, shortDate, Table } from "@/components/admin-bits";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminAudit() {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(300);
  return (
    <>
      <AdminHead
        title="Tarix"
        text="Saytdagi muhim harakatlar: kim qachon nima qildi (to'lov tasdiqlash, TOP berish, bloklash va h.k.). Faqat ko'rish uchun — biror narsa noto'g'ri ketsa, shu yerdan topasiz."
      />
      <Table head={["Vaqt (Toshkent)", "Kim", "Nima qildi", "Tafsilot", "IP"]} empty={rows.length === 0}>
        {rows.map((l) => (
          <tr key={l.id}>
            <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted">{shortDate(l.createdAt)}</td>
            <td className="px-4 py-2.5 text-xs">{l.actorLabel}</td>
            <td className="px-4 py-2.5 text-sm">{auditLabel(l.action)}</td>
            <td className="px-4 py-2.5 text-xs text-muted">
              {l.targetType} {l.targetId?.slice(0, 8)}
              {l.meta ? ` ${JSON.stringify(l.meta).slice(0, 80)}` : ""}
            </td>
            <td className="px-4 py-2.5 text-xs text-muted">{l.ip}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
