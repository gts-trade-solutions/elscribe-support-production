import { exec, query } from "@/lib/db";

/**
 * Ensure an active support session exists for a ticket.
 * Idempotent: if already exists, returns existing id.
 */
export async function ensureSupportSession(ticketId: string): Promise<string> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM support_sessions WHERE ticket_id = ? AND status = 'active' LIMIT 1`,
    [ticketId],
  );
  if (rows[0]?.id) return rows[0].id;

  const id = crypto.randomUUID();
  await exec(
    `INSERT INTO support_sessions (id, ticket_id, status) VALUES (?, ?, 'active')`,
    [id, ticketId],
  );
  return id;
}
