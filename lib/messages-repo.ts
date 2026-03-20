import { randomUUID } from "crypto";
import { query } from "@/lib/db";

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderRole: "customer" | "agent" | "admin";
  senderUserId: string;
  body: string;
  createdAt: string; // ISO (UTC)
  createdAtMs: number;
};

const normalizeRole = (role: string): "customer" | "agent" | "admin" => {
  if (role === "agent" || role === "admin") return role;
  return "customer";
};

export async function listTicketMessages(
  ticketId: string,
): Promise<TicketMessage[]> {
  const rows = await query(
    `SELECT id, ticket_id AS ticketId, sender_role AS senderRole, sender_user_id AS senderUserId,
            body,
            created_at AS createdAt,
            (UNIX_TIMESTAMP(created_at) * 1000) AS createdAtMs
     FROM ticket_messages
     WHERE ticket_id = ?
     ORDER BY created_at ASC`,
    [ticketId],
  );

  return (rows as any[]).map((r) => ({
    id: String(r.id),
    ticketId: String(r.ticketId),
    senderRole: normalizeRole(String(r.senderRole)),
    senderUserId: String(r.senderUserId),
    body: String(r.body),
    createdAtMs:
      Number(r.createdAtMs) ||
      (r.createdAt instanceof Date
        ? r.createdAt.getTime()
        : Date.parse(String(r.createdAt))),
    createdAt: (() => {
      const ms = Number(r.createdAtMs);
      if (Number.isFinite(ms) && ms > 0) return new Date(ms).toISOString();
      if (r.createdAt instanceof Date) return r.createdAt.toISOString();
      // If MySQL returns a plain timestamp string like "YYYY-MM-DD HH:mm:ss",
      // Date.parse will treat it as local time. We avoid that by trusting createdAtMs above.
      const fallback = Date.parse(String(r.createdAt));
      return Number.isFinite(fallback)
        ? new Date(fallback).toISOString()
        : String(r.createdAt);
    })(),
  }));
}

export async function createMessageForTicket(opts: {
  ticketId: string;
  senderRole: "customer" | "agent" | "admin";
  senderUserId: string;
  body: string;
}): Promise<TicketMessage> {
  const id = randomUUID();

  await query(
    `INSERT INTO ticket_messages (id, ticket_id, sender_role, sender_user_id, body)
     VALUES (?, ?, ?, ?, ?)`,
    [id, opts.ticketId, opts.senderRole, opts.senderUserId, opts.body],
  );

  // Read the DB timestamp to keep time consistent across REST + Socket + refresh.
  const rows = await query(
    `SELECT created_at AS createdAt, (UNIX_TIMESTAMP(created_at) * 1000) AS createdAtMs
     FROM ticket_messages
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  const r = (rows as any[])?.[0] || {};
  const createdAtMs =
    Number(r.createdAtMs) ||
    (r.createdAt instanceof Date ? r.createdAt.getTime() : Date.now());

  return {
    id,
    ticketId: opts.ticketId,
    senderRole: opts.senderRole,
    senderUserId: opts.senderUserId,
    body: opts.body,
    createdAtMs,
    createdAt: new Date(createdAtMs).toISOString(),
  };
}
