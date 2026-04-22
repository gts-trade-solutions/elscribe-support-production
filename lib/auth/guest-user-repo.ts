import { query, transaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export type ExistingUserLookup = {
  id: string;
  isGuest: boolean;
};

export async function findExistingUserByEmail(
  email: string,
): Promise<ExistingUserLookup | null> {
  const rows = await query<{ id: string; is_guest: number | boolean }>(
    `SELECT id, is_guest
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
    [email.trim()],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, isGuest: Number(row.is_guest) === 1 };
}

export async function createGuestUser(params: {
  email: string;
  createdByUserId: string;
}): Promise<{ userId: string; accountId: string }> {
  const email = params.email.toLowerCase().trim();

  // Unusable password: hash a random 32-byte hex string that is never
  // returned anywhere. Guarantees the row cannot be logged into via password
  // even if an attacker somehow forges a login attempt.
  const randomSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const passwordHash = await hashPassword(randomSecret);

  // createdByUserId is accepted here so callers can pass agent identity through
  // a single createGuestUser → createMagicLink flow. The magic_link row stores
  // the agent attribution; the users row itself does not.
  void params.createdByUserId;

  return transaction(async (tx) => {
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    await tx.exec(
      `INSERT INTO users (id, email, password_hash, role, is_guest, created_at, updated_at)
         VALUES (?, ?, ?, 'customer', 1, NOW(), NOW())`,
      [userId, email, passwordHash],
    );

    await tx.exec(
      `INSERT INTO accounts (id, type, owner_user_id, seat_limit, plan_code, billing_status, created_at, updated_at)
         VALUES (?, 'individual', ?, 1, NULL, 'inactive', NOW(), NOW())`,
      [accountId, userId],
    );

    await tx.exec(
      `INSERT INTO account_memberships (id, account_id, user_id, membership_role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'owner', 'active', NOW(), NOW())`,
      [membershipId, accountId, userId],
    );

    await tx.exec(
      `INSERT INTO customer_public_profiles (user_id, created_at) VALUES (?, NOW())`,
      [userId],
    );

    await tx.exec(
      `INSERT INTO customer_private_profiles (user_id, email, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())`,
      [userId, email],
    );

    return { userId, accountId };
  });
}

export type GuestUserInfo = {
  id: string;
  email: string;
  accountId: string;
  createdAt: string;
};

export async function getGuestUser(
  userId: string,
): Promise<GuestUserInfo | null> {
  const rows = await query<{
    id: string;
    email: string;
    account_id: string;
    created_at: string | Date;
  }>(
    `SELECT u.id          AS id,
            u.email       AS email,
            m.account_id  AS account_id,
            u.created_at  AS created_at
       FROM users u
       JOIN account_memberships m
         ON m.user_id = u.id
        AND m.status = 'active'
        AND m.membership_role = 'owner'
       JOIN accounts a
         ON a.id = m.account_id
        AND a.type = 'individual'
      WHERE u.id = ?
        AND u.is_guest = 1
      ORDER BY m.created_at ASC
      LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    accountId: row.account_id,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
