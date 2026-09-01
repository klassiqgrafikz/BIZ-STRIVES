// Audit logger — Phase 21
// Centralized to ensure financial changes are tracked
import prisma from "@/lib/db/prisma";

export type AuditParams = {
  businessId?: string | null;
  userId?: string | null;
  action: string; // e.g., transaction.created, month.closed
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

export async function auditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        businessId: params.businessId ?? undefined,
        userId: params.userId ?? undefined,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? undefined,
        before: params.before ? (params.before as object) : undefined,
        after: params.after ? (params.after as object) : undefined,
      },
    });
  } catch (e) {
    // Never throw from audit — log to console
    console.error("[auditLog] failed", e);
  }
}

// Helper to require business isolation — all queries must filter by businessId for non-admin callers
export function assertBusinessScope(businessId: string | undefined | null) {
  if (!businessId) throw new Error("businessId required — data isolation violation");
  return businessId;
}
