import "server-only";
import { desc, eq } from "drizzle-orm";
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

export async function myClientOrders(userId: string, limit = 50) {
  return db
    .select({ ...orderCols, editorName: editorProfiles.displayName })
    .from(orders)
    .leftJoin(editorProfiles, eq(editorProfiles.id, orders.editorId))
    .where(eq(orders.clientId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function myEditorOrders(editorId: string, limit = 50) {
  return db
    .select({ ...orderCols, clientName: users.name })
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

export async function myPayments(userId: string) {
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(30);
}
