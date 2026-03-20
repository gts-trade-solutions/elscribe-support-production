import { query, transaction } from "@/lib/db";

export type AccountType = "individual" | "company";
export type MembershipRole = "owner" | "member";

export type AccountSummary = {
  accountId: string;
  type: AccountType;
  ownerUserId: string;
  seatLimit: number;
  planCode: string | null;
  billingStatus: string;
};

export type MembershipRow = {
  membershipId: string;
  accountId: string;
  userId: string;
  email: string;
  membershipRole: MembershipRole;
  status: "active" | "removed";
  createdAt: string;
};

export type InviteRow = {
  id: string;
  accountId: string;
  email: string;
  token: string;
  expiresAt: string;
  invitedByUserId: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  createdAt: string;
};

export async function getAccountSummary(
  accountId: string,
): Promise<AccountSummary | null> {
  const rows = await query<AccountSummary>(
    `SELECT id AS accountId,
            type,
            owner_user_id AS ownerUserId,
            seat_limit AS seatLimit,
            plan_code AS planCode,
            billing_status AS billingStatus
       FROM accounts
       WHERE id = ?
       LIMIT 1`,
    [accountId],
  );
  return rows[0] ?? null;
}

export async function countOccupiedSeats(accountId: string): Promise<number> {
  const rows = await query<{ c: number }>(
    `SELECT COUNT(*) AS c
       FROM account_memberships
       WHERE account_id = ?
         AND status = 'active'`,
    [accountId],
  );
  return Number(rows[0]?.c ?? 0);
}

export async function countActiveMembers(accountId: string): Promise<number> {
  return countOccupiedSeats(accountId);
}

// A user might still have their own individual account (as owner) while also being a
// *member* of someone else's company. We must block converting their individual account
// into a company account in that situation.
export async function hasActiveCompanyMembership(
  userId: string,
): Promise<boolean> {
  const rows = await query<{ c: number }>(
    `SELECT COUNT(*) AS c
       FROM account_memberships m
       JOIN accounts a ON a.id = m.account_id
      WHERE m.user_id = ?
        AND m.status = 'active'
        AND m.membership_role = 'member'
        AND a.type = 'company'`,
    [userId],
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

export async function listActiveMembers(
  accountId: string,
): Promise<MembershipRow[]> {
  return query<MembershipRow>(
    `SELECT m.id AS membershipId,
            m.account_id AS accountId,
            m.user_id AS userId,
            u.email AS email,
            m.membership_role AS membershipRole,
            m.status AS status,
            m.created_at AS createdAt
       FROM account_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.account_id = ?
         AND m.status = 'active'
       ORDER BY (m.membership_role = 'owner') DESC, m.created_at ASC`,
    [accountId],
  );
}

export async function listPendingInvites(
  accountId: string,
): Promise<InviteRow[]> {
  return query<InviteRow>(
    `SELECT id,
            account_id AS accountId,
            email,
            token,
            expires_at AS expiresAt,
            invited_by_user_id AS invitedByUserId,
            status,
            created_at AS createdAt
       FROM account_invites
       WHERE account_id = ?
         AND status = 'pending'
       ORDER BY created_at DESC`,
    [accountId],
  );
}

export async function createInvite(params: {
  accountId: string;
  invitedByUserId: string;
  email: string;
  token: string;
  expiresAt: Date;
}): Promise<{ id: string; token: string; expiresAt: string }> {
  const id = crypto.randomUUID();
  const email = params.email.toLowerCase().trim();

  await query(
    `INSERT INTO account_invites (id, account_id, email, token, expires_at, invited_by_user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
    [
      id,
      params.accountId,
      email,
      params.token,
      params.expiresAt,
      params.invitedByUserId,
    ],
  );

  return { id, token: params.token, expiresAt: params.expiresAt.toISOString() };
}

export async function revokeInvite(
  inviteId: string,
  accountId: string,
): Promise<void> {
  await query(
    `UPDATE account_invites
        SET status = 'revoked', updated_at = NOW()
      WHERE id = ?
        AND account_id = ?
        AND status = 'pending'`,
    [inviteId, accountId],
  );
}

export async function acceptInvite(params: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<{ accountId: string }> {
  const token = params.token.trim();
  const userEmail = params.userEmail.toLowerCase().trim();

  return transaction(async (tx) => {
    const invites = await tx.query<{
      id: string;
      accountId: string;
      email: string;
      expiresAt: string;
      status: string;
    }>(
      `SELECT id,
              account_id AS accountId,
              email,
              expires_at AS expiresAt,
              status
         FROM account_invites
         WHERE token = ?
         LIMIT 1`,
      [token],
    );

    const inv = invites[0];
    if (!inv) throw new Error("INVITE_NOT_FOUND");
    if (inv.status !== "pending") throw new Error("INVITE_NOT_PENDING");

    const expires = new Date(inv.expiresAt);
    if (Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
      await tx.exec(
        `UPDATE account_invites SET status='expired', updated_at=NOW() WHERE id=?`,
        [inv.id],
      );
      throw new Error("INVITE_EXPIRED");
    }

    if (inv.email.toLowerCase().trim() !== userEmail) {
      throw new Error("INVITE_EMAIL_MISMATCH");
    }

    // Seat check (seat_limit includes the owner seat)
    const seatRows = await tx.query<{ seatLimit: number }>(
      `SELECT seat_limit AS seatLimit FROM accounts WHERE id = ? LIMIT 1`,
      [inv.accountId],
    );
    const seatLimit = Number(seatRows[0]?.seatLimit ?? 1);

    const countRows = await tx.query<{ c: number }>(
      `SELECT COUNT(*) AS c
         FROM account_memberships
        WHERE account_id = ?
          AND status = 'active'`,
      [inv.accountId],
    );

    const occupiedSeats = Number(countRows[0]?.c ?? 0);
    if (occupiedSeats >= seatLimit) throw new Error("SEAT_LIMIT_REACHED");

    // Create membership if not exists
    const membershipId = crypto.randomUUID();
    await tx.exec(
      `INSERT INTO account_memberships (id, account_id, user_id, membership_role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'member', 'active', NOW(), NOW())
      ON DUPLICATE KEY UPDATE status='active', updated_at=NOW()`,
      [membershipId, inv.accountId, params.userId],
    );

    await tx.exec(
      `UPDATE account_invites SET status='accepted', updated_at=NOW() WHERE id=?`,
      [inv.id],
    );

    return { accountId: inv.accountId };
  });
}

export async function removeMember(params: {
  accountId: string;
  targetUserId: string;
  actorUserId: string;
}): Promise<void> {
  await query(
    `UPDATE account_memberships
        SET status='removed', updated_at=NOW()
      WHERE account_id = ?
        AND user_id = ?
        AND user_id <> ?
        AND status='active'`,
    [params.accountId, params.targetUserId, params.actorUserId],
  );
}

export async function convertAccountToCompany(
  accountId: string,
  ownerUserId: string,
): Promise<void> {
  await query(
    `UPDATE accounts
        SET type='company',
            seat_limit = 1,
            plan_code = NULL,
            billing_status = 'inactive',
            updated_at=NOW()
      WHERE id = ?
        AND owner_user_id = ?
        AND type = 'individual'`,
    [accountId, ownerUserId],
  );
}
