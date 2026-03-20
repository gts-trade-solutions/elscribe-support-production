import { randomUUID } from "crypto";
import { exec, query, transaction } from "@/lib/db";

export type CallRequestType = "voice" | "video";
export type CallRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "canceled"
  | "ended";
export type RequestedBy = "customer" | "agent";

export type CallRequestRow = {
  id: string;
  ticketId: string;
  type: CallRequestType;
  requestedBy: RequestedBy;
  status: CallRequestStatus;
  createdAt: string;
  updatedAt: string;
};

function mapRow(r: any): CallRequestRow {
  return {
    id: String(r.id),
    ticketId: String(r.ticket_id),
    type: r.type as CallRequestType,
    requestedBy: r.requested_by as RequestedBy,
    status: r.status as CallRequestStatus,
    createdAt: r.created_at
      ? new Date(r.created_at).toISOString()
      : new Date().toISOString(),
    updatedAt: r.updated_at
      ? new Date(r.updated_at).toISOString()
      : new Date().toISOString(),
  };
}

function roomNameForTicket(ticketId: string) {
  return `ticket_${ticketId}`;
}

async function upsertMediaRoomTx(tx: any, ticketId: string) {
  const roomName = roomNameForTicket(ticketId);
  await tx.exec(
    `INSERT INTO media_rooms (ticket_id, provider, room_name, active)
     VALUES (?, 'livekit', ?, 1)
     ON DUPLICATE KEY UPDATE
       provider = VALUES(provider),
       room_name = VALUES(room_name),
       active = 1,
       updated_at = NOW()`,
    [ticketId, roomName],
  );
}

export async function getLatestCallRequestForTicket(
  ticketId: string,
): Promise<CallRequestRow | null> {
  const rows: any[] = await query(
    `SELECT id, ticket_id, type, requested_by, status, created_at, updated_at
       FROM call_requests
      WHERE ticket_id = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [ticketId],
  );
  if (!rows || rows.length === 0) return null;
  return mapRow(rows[0]);
}

export async function getCallRequestById(args: {
  ticketId: string;
  requestId: string;
}): Promise<CallRequestRow | null> {
  const rows: any[] = await query(
    `SELECT id, ticket_id, type, requested_by, status, created_at, updated_at
       FROM call_requests
      WHERE id = ? AND ticket_id = ?
      LIMIT 1`,
    [args.requestId, args.ticketId],
  );
  if (!rows || rows.length === 0) return null;
  return mapRow(rows[0]);
}

export async function createCallRequest(args: {
  ticketId: string;
  type: CallRequestType;
  requestedBy: RequestedBy;
  requestedByUserId?: string | null; // kept for API parity (DB does not store this field yet)
}): Promise<CallRequestRow> {
  const idRows: any[] = await query("SELECT UUID() AS id");
  const id = String(idRows?.[0]?.id ?? randomUUID());

  await exec(
    `INSERT INTO call_requests
      (id, ticket_id, type, requested_by, status, created_at)
     VALUES
      (?, ?, ?, ?, 'pending', NOW())`,
    [id, args.ticketId, args.type, args.requestedBy],
  );

  const row = await getCallRequestById({
    ticketId: args.ticketId,
    requestId: id,
  });
  if (!row) throw new Error("Failed to create call request");
  return row;
}

export async function acceptCallRequest(args: {
  ticketId: string;
  requestId: string;
  acceptedByUserId: string;
}): Promise<CallRequestRow> {
  return transaction(async (tx) => {
    const existingRows: any[] = await tx.query(
      `SELECT id, ticket_id, type, requested_by, status, created_at, updated_at
         FROM call_requests
        WHERE id = ? AND ticket_id = ?
        LIMIT 1`,
      [args.requestId, args.ticketId],
    );
    if (!existingRows[0]) throw new Error("CALL_REQUEST_NOT_FOUND");

    const existing = mapRow(existingRows[0]);

    // Idempotent accept
    if (existing.status === "accepted") {
      await upsertMediaRoomTx(tx, args.ticketId);
      return existing;
    }

    if (existing.status !== "pending") {
      throw new Error("CALL_REQUEST_NOT_PENDING");
    }

    await tx.exec(
      `UPDATE call_requests
          SET status = 'accepted', updated_at = NOW()
        WHERE id = ? AND ticket_id = ?`,
      [args.requestId, args.ticketId],
    );

    await upsertMediaRoomTx(tx, args.ticketId);

    const rows: any[] = await tx.query(
      `SELECT id, ticket_id, type, requested_by, status, created_at, updated_at
         FROM call_requests
        WHERE id = ? AND ticket_id = ?
        LIMIT 1`,
      [args.requestId, args.ticketId],
    );

    return mapRow(rows[0]);
  });
}

export async function endCallRequest(args: {
  ticketId: string;
  requestId: string;
}): Promise<CallRequestRow> {
  await exec(
    `UPDATE call_requests
        SET status = 'ended', updated_at = NOW()
      WHERE id = ? AND ticket_id = ?`,
    [args.requestId, args.ticketId],
  );

  await exec(
    `UPDATE media_rooms
        SET active = 0, updated_at = NOW()
      WHERE ticket_id = ?`,
    [args.ticketId],
  );

  const row = await getCallRequestById({
    ticketId: args.ticketId,
    requestId: args.requestId,
  });
  if (!row) throw new Error("CALL_REQUEST_NOT_FOUND");
  return row;
}

export async function getActiveAcceptedCallForTicket(
  ticketId: string,
): Promise<CallRequestRow | null> {
  const rows: any[] = await query(
    `SELECT id, ticket_id, type, requested_by, status, created_at, updated_at
       FROM call_requests
      WHERE ticket_id = ?
        AND status = 'accepted'
      ORDER BY updated_at DESC
      LIMIT 1`,
    [ticketId],
  );
  if (!rows || rows.length === 0) return null;
  return mapRow(rows[0]);
}
