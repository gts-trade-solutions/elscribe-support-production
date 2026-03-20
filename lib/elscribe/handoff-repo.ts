import { exec, query, transaction } from "@/lib/db";
import {
  findUserByEmail,
  getPrimaryAccountContextForUser,
} from "@/lib/auth/user-repo";
import { hashPassword } from "@/lib/auth/password";
import { ensureSupportSession } from "@/lib/support-session-repo";
import type { ElsHandoffPayload } from "@/lib/elscribe/schema";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";
const SYSTEM_USER_EMAIL = "system@elscribe.local";

/**
 * Ensure a non-login system user exists to own placeholder accounts for handoff tickets
 * created before the customer signs up/logs in.
 */
async function ensureSystemUser(): Promise<string> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM users WHERE id = ? LIMIT 1`,
    [SYSTEM_USER_ID],
  );
  if (rows[0]?.id) return rows[0].id;

  const randomPassword = `sys_${crypto.randomUUID()}_${Date.now()}`;
  const passwordHash = await hashPassword(randomPassword);

  await exec(
    `INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', NOW(), NOW())`,
    [SYSTEM_USER_ID, SYSTEM_USER_EMAIL, passwordHash],
  );

  return SYSTEM_USER_ID;
}

async function createPlaceholderAccount(systemUserId: string): Promise<string> {
  const accountId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();

  await transaction(async (tx) => {
    await tx.exec(
      `INSERT INTO accounts (id, type, owner_user_id, seat_limit, plan_code, billing_status, created_at, updated_at)
       VALUES (?, 'individual', ?, 1, NULL, 'active', NOW(), NOW())`,
      [accountId, systemUserId],
    );

    await tx.exec(
      `INSERT INTO account_memberships (id, account_id, user_id, membership_role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', 'active', NOW(), NOW())`,
      [membershipId, accountId, systemUserId],
    );
  });

  return accountId;
}

function randomAlias(): string {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `Customer #${hex}`;
}

export async function createOrGetElscribeTicket(
  payload: ElsHandoffPayload,
): Promise<{
  ticketId: string;
  createdNew: boolean;
}> {
  // 1) Idempotency by external_session_id
  const existing = await query<{ id: string }>(
    `SELECT id FROM tickets WHERE external_source = 'elscribe' AND external_session_id = ? LIMIT 1`,
    [payload.external_session_id],
  );
  if (existing[0]?.id) {
    await ensureSupportSession(existing[0].id);
    await ensureHandoffRow(
      payload.external_session_id,
      existing[0].id,
      payload.customer_email ?? null,
    );
    return { ticketId: existing[0].id, createdNew: false };
  }

  // 2) Try to attach to an existing customer if we can identify them by email
  let accountId: string | null = null;
  let createdByUserId: string | null = null;

  if (payload.customer_email) {
    const user = await findUserByEmail(payload.customer_email);
    if (user) {
      const ctx = await getPrimaryAccountContextForUser(user.id);
      if (ctx?.accountId) {
        accountId = ctx.accountId;
        createdByUserId = user.id;
      }
    }
  }

  // 3) Otherwise create a placeholder account owned by the system user
  if (!accountId || !createdByUserId) {
    const sysId = await ensureSystemUser();
    accountId = await createPlaceholderAccount(sysId);
    createdByUserId = sysId;
  }

  const ticketId = crypto.randomUUID();
  const alias = randomAlias();
  const description = payload.description ?? null;

  await transaction(async (tx) => {
    await tx.exec(
      `INSERT INTO tickets (
        id, account_id, created_by_user_id, assigned_agent_id,
        status, priority, category, subject, description,
        external_source, external_session_id
      ) VALUES (?, ?, ?, NULL, 'open', 'medium', NULL, ?, ?, 'elscribe', ?)`,
      [
        ticketId,
        accountId,
        createdByUserId,
        payload.issue_summary,
        description,
        payload.external_session_id,
      ],
    );

    await tx.exec(
      `INSERT INTO ticket_aliases (ticket_id, agent_alias) VALUES (?, ?)`,
      [ticketId, alias],
    );
  });

  await ensureSupportSession(ticketId);
  await ensureHandoffRow(
    payload.external_session_id,
    ticketId,
    payload.customer_email ?? null,
  );

  return { ticketId, createdNew: true };
}

async function ensureHandoffRow(
  externalSessionId: string,
  ticketId: string,
  prefillEmail: string | null,
): Promise<void> {
  await exec(
    `INSERT INTO elscribe_handoffs (id, external_session_id, ticket_id, prefill_email, created_at, expires_at, consumed_by_user_id)
     VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), NULL)
     ON DUPLICATE KEY UPDATE ticket_id = VALUES(ticket_id), prefill_email = COALESCE(VALUES(prefill_email), prefill_email)`,
    [crypto.randomUUID(), externalSessionId, ticketId, prefillEmail],
  );
}

export async function getPrefillEmailForTicket(
  ticketId: string,
): Promise<string | null> {
  const rows = await query<{ prefill_email: string | null }>(
    `SELECT prefill_email FROM elscribe_handoffs WHERE ticket_id = ? LIMIT 1`,
    [ticketId],
  );
  return rows[0]?.prefill_email ?? null;
}

export async function consumeHandoffTicket(params: {
  ticketId: string;
  tokenUserId: string;
  tokenAccountId: string | null;
  tokenMembershipRole: "owner" | "member" | null;
}): Promise<"ok" | "unauthorized" | "not_found"> {
  const { ticketId, tokenUserId, tokenAccountId, tokenMembershipRole } = params;
  if (!tokenAccountId) return "unauthorized";

  return transaction(async (tx) => {
    const rows = await tx.query<{
      id: string;
      account_id: string;
      created_by_user_id: string;
      external_source: string;
    }>(
      `SELECT id, account_id, created_by_user_id, external_source
         FROM tickets
        WHERE id = ?
        LIMIT 1
        FOR UPDATE`,
      [ticketId],
    );

    const t = rows[0];
    if (!t) return "not_found";

    const markConsumed = async () => {
      // Mark the handoff as consumed by the first authorized user who lands here.
      // If it was already consumed, keep the original consumer (idempotent).
      await tx.exec(
        `UPDATE elscribe_handoffs
            SET consumed_by_user_id = COALESCE(consumed_by_user_id, ?)
          WHERE ticket_id = ?`,
        [tokenUserId, ticketId],
      );
    };

    // If ticket already in user's account, enforce scoping (member only own ticket)
    if (t.account_id === tokenAccountId) {
      if (tokenMembershipRole === "owner") {
        await markConsumed();
        return "ok";
      }
      if (t.created_by_user_id === tokenUserId) {
        await markConsumed();
        return "ok";
      }
      return "unauthorized";
    }

    // Otherwise, only allow "system-owned elscribe tickets" to be claimed by the logged-in customer.
    if (t.external_source !== "elscribe") return "unauthorized";
    if (t.created_by_user_id !== SYSTEM_USER_ID) return "unauthorized";

    await tx.exec(
      `UPDATE tickets
          SET account_id = ?, created_by_user_id = ?, updated_at = NOW()
        WHERE id = ?`,
      [tokenAccountId, tokenUserId, ticketId],
    );

    await markConsumed();

    return "ok";
  });
}

export const ELSCRIBE_SYSTEM_USER_ID = SYSTEM_USER_ID;
