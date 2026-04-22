import { exec, query, transaction } from "@/lib/db";

export type MagicLinkRow = {
  id: string;
  ticketId: string;
  guestUserId: string;
  tokenHash: string;
  createdByUserId: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedByUserId: string | null;
  lastVisitedAt: string | null;
  visitCount: number;
  createdAt: string;
  updatedAt: string;
};

type RawRow = {
  id: string;
  ticket_id: string;
  guest_user_id: string;
  token_hash: string;
  created_by_user_id: string;
  expires_at: string | Date;
  revoked_at: string | Date | null;
  revoked_by_user_id: string | null;
  last_visited_at: string | Date | null;
  visit_count: number;
  created_at: string | Date;
  updated_at: string | Date;
};

const SELECT_COLS = `
  id,
  ticket_id,
  guest_user_id,
  token_hash,
  created_by_user_id,
  expires_at,
  revoked_at,
  revoked_by_user_id,
  last_visited_at,
  visit_count,
  created_at,
  updated_at
`;

function toIso(value: string | Date | null): string | null {
  if (value == null) return null;
  return new Date(value).toISOString();
}

function mapRow(row: RawRow): MagicLinkRow {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    guestUserId: row.guest_user_id,
    tokenHash: row.token_hash,
    createdByUserId: row.created_by_user_id,
    expiresAt: new Date(row.expires_at).toISOString(),
    revokedAt: toIso(row.revoked_at),
    revokedByUserId: row.revoked_by_user_id,
    lastVisitedAt: toIso(row.last_visited_at),
    visitCount: Number(row.visit_count ?? 0),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function createMagicLink(params: {
  ticketId: string;
  guestUserId: string;
  createdByUserId: string;
  expiresAt: Date;
  tokenHash: string;
}): Promise<{ id: string }> {
  const id = crypto.randomUUID();

  await transaction(async (tx) => {
    // Enforce: at most one active link per ticket. Revoke any existing
    // active link and attribute the revocation to the creator of the
    // replacement.
    await tx.exec(
      `UPDATE ticket_magic_links
          SET revoked_at = NOW(),
              revoked_by_user_id = ?,
              updated_at = NOW()
        WHERE ticket_id = ?
          AND revoked_at IS NULL`,
      [params.createdByUserId, params.ticketId],
    );

    await tx.exec(
      `INSERT INTO ticket_magic_links
         (id, ticket_id, guest_user_id, token_hash, created_by_user_id,
          expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        params.ticketId,
        params.guestUserId,
        params.tokenHash,
        params.createdByUserId,
        params.expiresAt,
      ],
    );
  });

  return { id };
}

export async function findActiveByLinkId(
  linkId: string,
): Promise<MagicLinkRow | null> {
  const rows = await query<RawRow>(
    `SELECT ${SELECT_COLS}
       FROM ticket_magic_links
       WHERE id = ?
         AND revoked_at IS NULL
         AND expires_at > NOW()
       LIMIT 1`,
    [linkId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function findByLinkIdIncludingInactive(
  linkId: string,
): Promise<MagicLinkRow | null> {
  const rows = await query<RawRow>(
    `SELECT ${SELECT_COLS}
       FROM ticket_magic_links
       WHERE id = ?
       LIMIT 1`,
    [linkId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function findActiveByTicketId(
  ticketId: string,
): Promise<MagicLinkRow | null> {
  const rows = await query<RawRow>(
    `SELECT ${SELECT_COLS}
       FROM ticket_magic_links
       WHERE ticket_id = ?
         AND revoked_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
    [ticketId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listByTicketId(
  ticketId: string,
): Promise<MagicLinkRow[]> {
  const rows = await query<RawRow>(
    `SELECT ${SELECT_COLS}
       FROM ticket_magic_links
       WHERE ticket_id = ?
       ORDER BY created_at DESC`,
    [ticketId],
  );
  return rows.map(mapRow);
}

export async function revokeLink(params: {
  linkId: string;
  revokedByUserId: string;
}): Promise<void> {
  await exec(
    `UPDATE ticket_magic_links
        SET revoked_at = NOW(),
            revoked_by_user_id = ?,
            updated_at = NOW()
      WHERE id = ?
        AND revoked_at IS NULL`,
    [params.revokedByUserId, params.linkId],
  );
}

export async function extendLink(params: {
  linkId: string;
  newExpiresAt: Date;
}): Promise<void> {
  await exec(
    `UPDATE ticket_magic_links
        SET expires_at = ?,
            updated_at = NOW()
      WHERE id = ?`,
    [params.newExpiresAt, params.linkId],
  );
}

export async function recordVisit(linkId: string): Promise<void> {
  await exec(
    `UPDATE ticket_magic_links
        SET visit_count = visit_count + 1,
            last_visited_at = NOW(),
            updated_at = NOW()
      WHERE id = ?`,
    [linkId],
  );
}

export async function listByGuestUserId(
  guestUserId: string,
): Promise<MagicLinkRow[]> {
  const rows = await query<RawRow>(
    `SELECT ${SELECT_COLS}
       FROM ticket_magic_links
       WHERE guest_user_id = ?
       ORDER BY created_at DESC`,
    [guestUserId],
  );
  return rows.map(mapRow);
}
