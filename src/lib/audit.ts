import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function audit(e: {
  actorId?: string | null;
  actorLabel?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      actorId: e.actorId ?? null,
      actorLabel: e.actorLabel ?? "",
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      meta: e.meta,
      ip: e.ip,
    });
  } catch (err) {
    console.error("[audit] failed", err);
  }
}
