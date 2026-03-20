import { randomUUID } from "crypto";
import { exec, query } from "@/lib/db";

export type BillingOverrideState = "cleared" | "blocked";

export type TicketBillingOverride = {
  id: string;
  ticketId: string;
  state: BillingOverrideState;
  note: string | null;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

function mapRow(r: any): TicketBillingOverride {
  return {
    id: String(r.id),
    ticketId: String(r.ticket_id),
    state: r.state as BillingOverrideState,
    note: r.note ? String(r.note) : null,
    updatedByUserId: String(r.updated_by_user_id),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export async function getTicketBillingOverride(ticketId: string) {
  const rows: any[] = await query(
    `SELECT *
       FROM ticket_billing_overrides
      WHERE ticket_id = ?
      LIMIT 1`,
    [ticketId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function upsertTicketBillingOverride(args: {
  ticketId: string;
  state: BillingOverrideState;
  note?: string | null;
  updatedByUserId: string;
}) {
  const existing = await getTicketBillingOverride(args.ticketId);
  const id = existing?.id ?? randomUUID();

  await exec(
    `INSERT INTO ticket_billing_overrides
      (id, ticket_id, state, note, updated_by_user_id, created_at, updated_at)
     VALUES
      (?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
      state = VALUES(state),
      note = VALUES(note),
      updated_by_user_id = VALUES(updated_by_user_id),
      updated_at = NOW()`,
    [id, args.ticketId, args.state, args.note ?? null, args.updatedByUserId],
  );

  return getTicketBillingOverride(args.ticketId);
}

export async function clearTicketBillingOverride(ticketId: string) {
  await exec(`DELETE FROM ticket_billing_overrides WHERE ticket_id = ?`, [
    ticketId,
  ]);
}
