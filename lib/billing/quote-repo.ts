import { exec, query } from "@/lib/db";

export type TicketQuoteRow = {
  id: string;
  ticketId: string;
  quotedByUserId: string;
  amount: number;
  currency: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(r: any): TicketQuoteRow {
  return {
    id: String(r.id),
    ticketId: String(r.ticket_id),
    quotedByUserId: String(r.quoted_by_user_id),
    amount: Number(r.amount),
    currency: String(r.currency),
    note: r.note == null ? null : String(r.note),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : "",
  };
}

export async function getTicketQuote(
  ticketId: string,
): Promise<TicketQuoteRow | null> {
  const rows: any[] = await query(
    `SELECT *
       FROM ticket_quotes
      WHERE ticket_id = ?
      LIMIT 1`,
    [ticketId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function upsertTicketQuote(args: {
  ticketId: string;
  quotedByUserId: string;
  amount: number;
  currency: string;
  note?: string | null;
}) {
  const existing = await getTicketQuote(args.ticketId);
  if (existing) {
    await exec(
      `UPDATE ticket_quotes
          SET quoted_by_user_id = ?,
              amount = ?,
              currency = ?,
              note = ?,
              updated_at = NOW()
        WHERE ticket_id = ?`,
      [
        args.quotedByUserId,
        args.amount,
        args.currency,
        args.note ?? null,
        args.ticketId,
      ],
    );
  } else {
    await exec(
      `INSERT INTO ticket_quotes
        (id, ticket_id, quoted_by_user_id, amount, currency, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        crypto.randomUUID(),
        args.ticketId,
        args.quotedByUserId,
        args.amount,
        args.currency,
        args.note ?? null,
      ],
    );
  }

  return getTicketQuote(args.ticketId);
}
