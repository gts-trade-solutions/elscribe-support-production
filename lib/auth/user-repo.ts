import { query, transaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export type DbUserRole = "customer" | "agent" | "admin";

export type SessionAccountContext = {
  accountId: string;
  accountType: "individual" | "company";
  membershipRole: "owner" | "member";
};

export type AuthUser = {
  id: string;
  email: string;
  role: DbUserRole;
  passwordHash: string;
};

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const rows = await query<AuthUser>(
    `SELECT id, email, role, password_hash AS passwordHash
       FROM users
       WHERE email = ?
       LIMIT 1`,
    [email.toLowerCase().trim()],
  );
  return rows[0] ?? null;
}

export async function getUserEmailById(userId: string): Promise<string | null> {
  const rows = await query<{ email: string }>(
    `SELECT email FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  return rows[0]?.email ?? null;
}

export async function getPrimaryAccountContextForUser(
  userId: string,
): Promise<SessionAccountContext | null> {
  const rows = await query<SessionAccountContext>(
    `SELECT m.account_id AS accountId,
            a.type AS accountType,
            m.membership_role AS membershipRole
       FROM account_memberships m
       JOIN accounts a ON a.id = m.account_id
      WHERE m.user_id = ?
        AND m.status = 'active'
      ORDER BY (a.type = 'company') DESC,
               (m.membership_role = 'owner') DESC,
               a.created_at ASC
      LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export type CreateUserInput = {
  email: string;
  password: string;
  role?: DbUserRole; // default: customer
};

/**
 * Part 3: keep this minimal by creating an Individual account at signup.
 * Part 4 will expand to Company accounts, invites, and seat enforcement.
 */
export async function createUserWithIndividualAccount(
  input: CreateUserInput,
): Promise<{ userId: string; accountId: string }> {
  const email = input.email.toLowerCase().trim();
  const role: DbUserRole = input.role ?? "customer";

  const passwordHash = await hashPassword(input.password);

  return transaction(async (tx) => {
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    await tx.exec(
      `INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [userId, email, passwordHash, role],
    );

    await tx.exec(
      `INSERT INTO accounts (id, type, owner_user_id, seat_limit, plan_code, billing_status, created_at, updated_at)
         VALUES (?, 'individual', ?, 1, 'free', 'active', NOW(), NOW())`,
      [accountId, userId],
    );

    await tx.exec(
      `INSERT INTO account_memberships (id, account_id, user_id, membership_role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'owner', 'active', NOW(), NOW())`,
      [membershipId, accountId, userId],
    );

    return { userId, accountId };
  });
}
