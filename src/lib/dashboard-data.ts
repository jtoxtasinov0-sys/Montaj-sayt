import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { editorProfiles, orders, payments, proposals, users } from "@/db/schema";

const orderCols = {
  id: orders.id,
  title: orders.title,
  status: orders.status,
  budgetUsd: orders.budgetUsd,
  agreedPriceUsd: orders.agreedPriceUsd,
  deadline: orders.deadline,
  createdAt: orders.createdAt,
  proposalCount: orders.proposalCount,
};

// Loyiha xonasida o'qilmagan xabar bormi (oxirgi xabar shu tomon oxirgi ko'rgan vaqtdan keyin)
const unreadClient = sql<boolean>`coalesce(${orders.lastMessageAt} > coalesce(${orders.clientReadAt}, 'epoch'), false)`;
const unreadEditor = sql<boolean>`coalesce(${orders.lastMessageAt} > coalesce(${orders.editorReadAt}, 'epoch'), false)`;

export async function myClientOrders(userId: string, limit = 50) {
  return db
    .select({ ...orderCols, editorName: editorProfiles.displayName, unread: unreadClient })
    .from(orders)
    .leftJoin(editorProfiles, eq(editorProfiles.id, orders.editorId))
    .where(eq(orders.clientId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function myEditorOrders(editorId: string, limit = 50) {
  return db
    .select({ ...orderCols, clientName: users.name, unread: unreadEditor })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.clientId))
    .where(eq(orders.editorId, editorId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function myProposals(editorId: string, limit = 50) {
  return db
    .select({
      id: proposals.id,
      status: proposals.status,
      priceUsd: proposals.priceUsd,
      days: proposals.days,
      createdAt: proposals.createdAt,
      orderId: orders.id,
      orderTitle: orders.title,
      orderStatus: orders.status,
    })
    .from(proposals)
    .innerJoin(orders, eq(orders.id, proposals.orderId))
    .where(eq(proposals.editorId, editorId))
    .orderBy(desc(proposals.createdAt))
    .limit(limit);
}

/** Kabinet menyusidagi qizil belgi: o'qilmagan xabarli buyurtmalar soni */
export async function unreadOrdersCount(userId: string, editorId: string | null) {
  const [c] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.clientId, userId), unreadClient));
  if (!editorId) return c.n;
  const [e] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.editorId, editorId), unreadEditor));
  return c.n + e.n;
}

export async function myPayments(userId: string) {
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(30);
}
