import { requireAdmin } from "@/lib/auth/current";
import { desc } from "drizzle-orm";
import { Table } from "@/components/admin-bits";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminAudit() {
  await requireAdmin(); // har bir sahifada alohida tekshiruv (faqat layout'ga ishonmaymiz)
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(300);
  return (
    <Table head={["Vaqt (UTC)", "Kim", "Amal", "Obyekt", "IP"]}>
      {rows.map((l) => (
        <tr key={l.id}>
          <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted">{l.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
          <td className="px-4 py-2.5 text-xs">{l.actorLabel}</td>
          <td className="px-4 py-2.5 text-xs text-primary-2">{l.action}</td>
          <td className="px-4 py-2.5 text-xs text-muted">
            {l.targetType} {l.targetId?.slice(0, 8)}
            {l.meta ? ` ${JSON.stringify(l.meta).slice(0, 80)}` : ""}
          </td>
          <td className="px-4 py-2.5 text-xs text-muted">{l.ip}</td>
        </tr>
      ))}
    </Table>
  );
}
