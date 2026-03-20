import { query, transaction } from "@/lib/db";

export type AgentRoleRequestStatus = "pending" | "approved" | "rejected";

export type AgentRoleRequestRow = {
  id: string;
  user_id: string;
  account_id: string | null;
  status: AgentRoleRequestStatus;
  reason: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by_user_id: string | null;
  decision_note: string | null;
};

export async function getMyLatestAgentRoleRequest(userId: string) {
  const rows = await query<AgentRoleRequestRow>(
    `SELECT *
       FROM agent_role_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function createAgentRoleRequest(params: {
  id: string;
  userId: string;
  accountId: string | null;
  reason: string | null;
}) {
  const pending = await query<{ c: number }>(
    `SELECT COUNT(*) AS c
       FROM agent_role_requests
      WHERE user_id = ?
        AND status = 'pending'`,
    [params.userId],
  );
  if (Number(pending[0]?.c ?? 0) > 0) {
    throw new Error("REQUEST_ALREADY_PENDING");
  }

  await query(
    `INSERT INTO agent_role_requests (id, user_id, account_id, status, reason)
     VALUES (?, ?, ?, 'pending', ?)`,
    [params.id, params.userId, params.accountId, params.reason],
  );
}

export async function listPendingAgentRoleRequests() {
  return await query<AgentRoleRequestRow>(
    `SELECT *
       FROM agent_role_requests
      WHERE status = 'pending'
      ORDER BY created_at ASC`,
    [],
  );
}

export async function decideAgentRoleRequest(params: {
  requestId: string;
  decision: "approved" | "rejected";
  decidedByUserId: string;
  decisionNote?: string | null;
}) {
  return await transaction(async (tx) => {
    const reqRows = await tx.query<AgentRoleRequestRow>(
      `SELECT *
         FROM agent_role_requests
        WHERE id = ?
        FOR UPDATE`,
      [params.requestId],
    );
    const req = reqRows[0];
    if (!req) throw new Error("NOT_FOUND");
    if (req.status !== "pending") throw new Error("ALREADY_DECIDED");

    await tx.exec(
      `UPDATE agent_role_requests
          SET status = ?,
              decided_at = NOW(),
              decided_by_user_id = ?,
              decision_note = ?
        WHERE id = ?`,
      [
        params.decision,
        params.decidedByUserId,
        params.decisionNote ?? null,
        params.requestId,
      ],
    );

    if (params.decision === "approved") {
      // Promote user to agent. This is a hard role change and will take effect on next login.
      await tx.exec(`UPDATE users SET role = 'agent' WHERE id = ?`, [
        req.user_id,
      ]);
    }

    return { ok: true };
  });
}
