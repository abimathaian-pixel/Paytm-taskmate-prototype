import { TaskScope, AuditEventActor } from "@taskmate/shared";
import { getDb, auditLogs } from "@taskmate/db";
import { randomUUID } from "crypto";

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export function verifyTaskScope(
  allowedScopes: TaskScope[],
  requiredScope: TaskScope
): void {
  if (!allowedScopes.includes(requiredScope)) {
    throw new PermissionError(
      `Permission Denied: Task lacks required scope '${requiredScope}'. Granted scopes: [${allowedScopes.join(
        ", "
      )}]`
    );
  }
}

export async function logAudit(params: {
  taskId?: string;
  actor: AuditEventActor;
  action: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      id: "audit-" + randomUUID(),
      taskId: params.taskId || null,
      actor: params.actor,
      action: params.action,
      details: params.details || {},
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
