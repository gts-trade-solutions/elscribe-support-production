import { query } from "@/lib/db";
import type { AuthedToken } from "@/lib/auth/server";

// Backward-compatible helper used by API routes.
// Some routes call `createAuditLog({ actorUserId, actorRole, ... })`.
// Keep this wrapper so ticket/message actions don't fail if the caller
// doesn't have the full `AuthedToken` object.
export async function createAuditLog(params: {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: any;
}): Promise<void> {
  const id = crypto.randomUUID();
  const metadataJson =
    params.metadata === undefined ? null : JSON.stringify(params.metadata);

  await query(
    `INSERT INTO audit_logs (id, actor_user_id, actor_role, action, entity_type, entity_id, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.actorUserId ?? null,
      params.actorRole ?? "system",
      params.action,
      params.entityType,
      params.entityId ?? null,
      metadataJson,
    ],
  );
}

export async function insertAuditLog(params: {
  actor: AuthedToken | { uid: string | null; role: string };
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: any;
}): Promise<void> {
  const id = crypto.randomUUID();
  const actorUserId = (params.actor as any).uid ?? null;
  const actorRole = (params.actor as any).role ?? "system";
  const metadataJson =
    params.metadata === undefined ? null : JSON.stringify(params.metadata);

  await query(
    `INSERT INTO audit_logs (id, actor_user_id, actor_role, action, entity_type, entity_id, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      actorUserId,
      actorRole,
      params.action,
      params.entityType,
      params.entityId ?? null,
      metadataJson,
    ],
  );
}
