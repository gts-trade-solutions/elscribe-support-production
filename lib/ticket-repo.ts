import { exec, query, transaction } from "@/lib/db";
import type { AuthedToken } from "@/lib/auth/server";
import { getCompanyPlanByCode } from "@/lib/billing/pricing";
import { getIncidentByCode } from "@/lib/billing/pricing";
import { hasCompanyPlanCoverage } from "@/lib/billing/subscription-repo";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type TicketRow = {
  id: string;
  account_id: string;
  created_by_user_id: string;
  assigned_agent_id: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  subject: string;
  description: string | null;
  external_source: string;
  external_session_id: string | null;
  incident_type_selected: string | null;
  resolution_incident_type: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketListItem = {
  id: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  subject: string;
  createdAt: string;
  updatedAt: string;
  assignedAgentId: string | null;
  incidentTypeSelected: string | null;
  latestPaymentStatus: string | null;
  paymentRequired: boolean;
  quoteRequired: boolean;
  quoteAvailable: boolean;
  quoteAmount: number | null;
  quoteCurrency: string | null;
  isPaid: boolean;
  coveredByPlan: boolean;
  coveredPlanCode: string | null;
  billingOverrideState: "cleared" | "blocked" | null;
};

export type AgentTicketListItem = TicketListItem & {
  agentAlias: string;
};

function deriveTicketBillingFlags(args: {
  incidentTypeSelected: string | null;
  isPaid: boolean;
  quoteAmount?: number | null;
  quoteCurrency?: string | null;
  coveredByPlan?: boolean;
  coveredPlanCode?: string | null;
  billingOverrideState?: "cleared" | "blocked" | null;
}) {
  const incident = getIncidentByCode(args.incidentTypeSelected);
  const coveredByPlan = Boolean(args.coveredByPlan);
  const hasQuote = Number(args.quoteAmount ?? 0) > 0;

  if (args.billingOverrideState === "cleared" && incident) {
    return {
      paymentRequired: false,
      quoteRequired: false,
      quoteAvailable: false,
      quoteAmount: null,
      quoteCurrency: null,
      coveredByPlan: false,
      coveredPlanCode: args.coveredPlanCode ?? null,
    };
  }

  if (args.billingOverrideState === "blocked" && incident) {
    return {
      paymentRequired: true,
      quoteRequired: false,
      quoteAvailable: false,
      quoteAmount: null,
      quoteCurrency: null,
      coveredByPlan: false,
      coveredPlanCode: args.coveredPlanCode ?? null,
    };
  }

  if (coveredByPlan && incident) {
    return {
      paymentRequired: false,
      quoteRequired: false,
      quoteAvailable: false,
      quoteAmount: null,
      quoteCurrency: null,
      coveredByPlan: true,
      coveredPlanCode: args.coveredPlanCode ?? null,
    };
  }

  const quoteRequired = Boolean(
    incident?.pricingModel === "quoted" && !hasQuote,
  );
  const quoteAvailable = Boolean(
    incident?.pricingModel === "quoted" && hasQuote && !args.isPaid,
  );
  const paymentRequired = Boolean(
    incident &&
    !args.isPaid &&
    (incident.pricingModel === "fixed" ||
      (incident.pricingModel === "quoted" && hasQuote)),
  );

  return {
    paymentRequired,
    quoteRequired,
    quoteAvailable,
    quoteAmount: hasQuote ? Number(args.quoteAmount) : null,
    quoteCurrency: hasQuote ? String(args.quoteCurrency || "") || null : null,
    coveredByPlan: false,
    coveredPlanCode: args.coveredPlanCode ?? null,
  };
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

export async function createTicket(params: {
  accountId: string;
  createdByUserId: string;
  subject: string;
  description?: string | null;
  category?: string | null;
  incidentTypeSelected?: string | null;
}): Promise<{ ticketId: string; alias: string }> {
  const ticketId = crypto.randomUUID();
  const alias = randomAlias();
  const category = params.category ?? null;
  const description = params.description ?? null;
  const incidentTypeSelected = params.incidentTypeSelected ?? null;

  await transaction(async (tx) => {
    const accountRows = await tx.query<{
      type: string;
      billingStatus: string;
    }>(
      `SELECT type, billing_status AS billingStatus
         FROM accounts
        WHERE id = ?
        LIMIT 1
        FOR UPDATE`,
      [params.accountId],
    );
    const account = accountRows[0];

    if (
      account &&
      account.type === "company" &&
      account.billingStatus === "active"
    ) {
      const subRows = await tx.query<{
        planCode: string | null;
        status: string;
        currentPeriodStart: string | null;
        currentPeriodEnd: string | null;
      }>(
        `SELECT plan_code AS planCode,
                status,
                current_period_start AS currentPeriodStart,
                current_period_end AS currentPeriodEnd
           FROM subscriptions
          WHERE account_id = ?
          LIMIT 1
          FOR UPDATE`,
        [params.accountId],
      );
      const sub = subRows[0];
      const plan = getCompanyPlanByCode(sub?.planCode ?? null);
      const periodStart = sub?.currentPeriodStart
        ? new Date(sub.currentPeriodStart)
        : null;
      const periodEnd = sub?.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd)
        : null;

      if (
        sub &&
        sub.status === "active" &&
        plan &&
        periodStart &&
        periodEnd &&
        !Number.isNaN(periodStart.getTime()) &&
        !Number.isNaN(periodEnd.getTime())
      ) {
        const countRows = await tx.query<{ c: number }>(
          `SELECT COUNT(*) AS c
             FROM tickets
            WHERE account_id = ?
              AND created_at >= ?
              AND created_at < ?`,
          [params.accountId, periodStart, periodEnd],
        );
        const used = Number(countRows[0]?.c ?? 0);
        if (used >= plan.fairUsageTicketLimit) {
          throw new Error(
            `FAIR_USAGE_LIMIT_REACHED:${plan.fairUsageTicketLimit}:${plan.code}`,
          );
        }
      }
    }

    await tx.exec(
      `INSERT INTO tickets (
        id, account_id, created_by_user_id, assigned_agent_id,
        status, priority, category, subject, description,
        external_source, external_session_id, incident_type_selected
      ) VALUES (?, ?, ?, NULL, 'open', 'medium', ?, ?, ?, 'direct', NULL, ?)`,
      [
        ticketId,
        params.accountId,
        params.createdByUserId,
        category,
        params.subject,
        description,
        incidentTypeSelected,
      ],
    );

    await tx.exec(
      `INSERT INTO ticket_aliases (ticket_id, agent_alias) VALUES (?, ?)`,
      [ticketId, alias],
    );
  });

  return { ticketId, alias };
}

export async function listTicketsForCustomer(
  token: AuthedToken,
): Promise<TicketListItem[]> {
  if (!token.accountId) return [];

  const isOwner = token.membershipRole === "owner";
  const sql = `SELECT t.id, t.status, t.priority, t.category, t.subject, t.created_at, t.updated_at,
                      t.assigned_agent_id, t.incident_type_selected,
                      q.amount AS quote_amount, q.currency AS quote_currency,
                      a.type AS account_type, a.billing_status AS account_billing_status,
                      s.plan_code AS covered_plan_code, s.status AS subscription_status,
                      (
                        SELECT p.status
                          FROM payments p
                         WHERE p.ticket_id = t.id AND p.type='incident'
                         ORDER BY p.created_at DESC
                         LIMIT 1
                      ) AS latest_payment_status,
                      EXISTS(
                        SELECT 1 FROM payments p2
                         WHERE p2.ticket_id = t.id AND p2.type='incident' AND p2.status='succeeded'
                      ) AS has_paid,
                      (
                        SELECT tbo.state FROM ticket_billing_overrides tbo
                         WHERE tbo.ticket_id = t.id
                         ORDER BY tbo.updated_at DESC, tbo.created_at DESC
                         LIMIT 1
                      ) AS billing_override_state
                 FROM tickets t
            LEFT JOIN ticket_quotes q ON q.ticket_id = t.id
            LEFT JOIN accounts a ON a.id = t.account_id
            LEFT JOIN subscriptions s ON s.account_id = t.account_id
                WHERE t.account_id = ?
                  ${isOwner ? "" : "AND t.created_by_user_id = ?"}
                ORDER BY t.updated_at DESC`;

  const rows = await query<any>(
    sql,
    isOwner ? [token.accountId] : [token.accountId, token.uid],
  );

  return rows.map((r) => {
    const isPaid = Number(r.has_paid) === 1;
    const incidentTypeSelected = r.incident_type_selected
      ? String(r.incident_type_selected)
      : null;
    const flags = deriveTicketBillingFlags({
      incidentTypeSelected,
      isPaid,
      quoteAmount: r.quote_amount,
      quoteCurrency: r.quote_currency,
      coveredByPlan: hasCompanyPlanCoverage({
        accountType: r.account_type,
        billingStatus: r.account_billing_status,
        planCode: r.covered_plan_code,
        subscriptionStatus: r.subscription_status,
      }),
      coveredPlanCode: r.covered_plan_code ? String(r.covered_plan_code) : null,
      billingOverrideState: r.billing_override_state
        ? (String(r.billing_override_state) as any)
        : null,
    });
    return {
      id: r.id,
      status: r.status,
      priority: r.priority,
      category: r.category,
      subject: r.subject,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      assignedAgentId: r.assigned_agent_id,
      incidentTypeSelected,
      latestPaymentStatus:
        r.billing_override_state === "cleared"
          ? "admin_cleared"
          : r.billing_override_state === "blocked"
            ? "admin_blocked"
            : r.latest_payment_status
              ? String(r.latest_payment_status)
              : null,
      isPaid,
      paymentRequired: flags.paymentRequired,
      quoteRequired: flags.quoteRequired,
      quoteAvailable: flags.quoteAvailable,
      quoteAmount: flags.quoteAmount,
      quoteCurrency: flags.quoteCurrency,
      coveredByPlan: flags.coveredByPlan,
      coveredPlanCode: flags.coveredPlanCode,
      billingOverrideState: r.billing_override_state
        ? (String(r.billing_override_state) as any)
        : null,
    };
  });
}

export async function getTicketForCustomer(params: {
  ticketId: string;
  token: AuthedToken;
}): Promise<(TicketRow & { agentAlias: string }) | null> {
  const { token, ticketId } = params;
  if (!token.accountId) return null;

  const isOwner = token.membershipRole === "owner";
  const sql = `SELECT t.*, a.agent_alias
       FROM tickets t
       JOIN ticket_aliases a ON a.ticket_id = t.id
      WHERE t.id = ? AND t.account_id = ?
        ${isOwner ? "" : "AND t.created_by_user_id = ?"}
      LIMIT 1`;

  const rows = await query<any>(
    sql,
    isOwner
      ? [ticketId, token.accountId]
      : [ticketId, token.accountId, token.uid],
  );
  if (!rows[0]) return null;
  return rows[0] as any;
}

export async function updateTicketForCustomer(params: {
  ticketId: string;
  token: AuthedToken;
  status?: TicketStatus;
  category?: string | null;
  subject?: string;
  description?: string | null;
  incidentTypeSelected?: string | null;
}): Promise<boolean> {
  const { token, ticketId } = params;
  if (!token.accountId) return false;

  const fields: string[] = [];
  const values: any[] = [];
  if (params.status) {
    fields.push("status = ?");
    values.push(params.status);
  }
  if (params.category !== undefined) {
    fields.push("category = ?");
    values.push(params.category);
  }
  if (params.subject) {
    fields.push("subject = ?");
    values.push(params.subject);
  }
  if (params.description !== undefined) {
    fields.push("description = ?");
    values.push(params.description);
  }
  if (params.incidentTypeSelected !== undefined) {
    fields.push("incident_type_selected = ?");
    values.push(params.incidentTypeSelected);
  }

  if (fields.length === 0) return true;

  const isOwner = token.membershipRole === "owner";
  const sql = `UPDATE tickets
        SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = ? AND account_id = ?
        ${isOwner ? "" : "AND created_by_user_id = ?"}`;
  const paramsArr = isOwner
    ? [...values, ticketId, token.accountId]
    : [...values, ticketId, token.accountId, token.uid];
  const packet = await exec(sql, paramsArr);

  return Number(packet?.affectedRows ?? 0) >= 0;
}

export async function updateTicketForAgent(params: {
  ticketId: string;
  agentId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  resolutionIncidentType?: string | null;
}): Promise<boolean> {
  const { ticketId, agentId, status } = params;

  const fields: string[] = [];
  const values: any[] = [];
  if (status) {
    fields.push("status = ?");
    values.push(status);
  }
  if (params.priority) {
    fields.push("priority = ?");
    values.push(params.priority);
  }
  if (params.resolutionIncidentType !== undefined) {
    fields.push("resolution_incident_type = ?");
    values.push(params.resolutionIncidentType);
  }
  if (!fields.length) return true;

  const packet = await exec(
    `UPDATE tickets
        SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = ? AND assigned_agent_id = ?`,
    [...values, ticketId, agentId],
  );
  return Number(packet?.affectedRows ?? 0) === 1;
}

export async function updateTicketForAdmin(params: {
  ticketId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string | null;
  subject?: string;
  description?: string | null;
  incidentTypeSelected?: string | null;
  resolutionIncidentType?: string | null;
}): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];

  if (params.status) {
    fields.push("status = ?");
    values.push(params.status);
  }
  if (params.priority) {
    fields.push("priority = ?");
    values.push(params.priority);
  }
  if (params.category !== undefined) {
    fields.push("category = ?");
    values.push(params.category);
  }
  if (params.subject) {
    fields.push("subject = ?");
    values.push(params.subject);
  }
  if (params.description !== undefined) {
    fields.push("description = ?");
    values.push(params.description);
  }
  if (params.incidentTypeSelected !== undefined) {
    fields.push("incident_type_selected = ?");
    values.push(params.incidentTypeSelected);
  }
  if (params.resolutionIncidentType !== undefined) {
    fields.push("resolution_incident_type = ?");
    values.push(params.resolutionIncidentType);
  }
  if (!fields.length) return true;

  const packet = await exec(
    `UPDATE tickets
        SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = ?`,
    [...values, params.ticketId],
  );
  return Number(packet?.affectedRows ?? 0) === 1;
}

function mapAgentTicketRow(r: any): AgentTicketListItem {
  const isPaid = Number(r.has_paid) === 1;
  const incidentTypeSelected = r.incident_type_selected
    ? String(r.incident_type_selected)
    : null;
  const flags = deriveTicketBillingFlags({
    incidentTypeSelected,
    isPaid,
    quoteAmount: r.quote_amount,
    quoteCurrency: r.quote_currency,
    coveredByPlan: hasCompanyPlanCoverage({
      accountType: r.account_type,
      billingStatus: r.account_billing_status,
      planCode: r.covered_plan_code,
      subscriptionStatus: r.subscription_status,
    }),
    coveredPlanCode: r.covered_plan_code ? String(r.covered_plan_code) : null,
    billingOverrideState: r.billing_override_state
      ? (String(r.billing_override_state) as any)
      : null,
  });
  return {
    id: r.id,
    status: r.status,
    priority: r.priority,
    category: r.category,
    subject: r.subject,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    assignedAgentId: r.assigned_agent_id,
    incidentTypeSelected,
    latestPaymentStatus:
      r.billing_override_state === "cleared"
        ? "admin_cleared"
        : r.billing_override_state === "blocked"
          ? "admin_blocked"
          : r.latest_payment_status
            ? String(r.latest_payment_status)
            : null,
    isPaid,
    paymentRequired: flags.paymentRequired,
    quoteRequired: flags.quoteRequired,
    quoteAvailable: flags.quoteAvailable,
    quoteAmount: flags.quoteAmount,
    quoteCurrency: flags.quoteCurrency,
    agentAlias: r.agent_alias,
    coveredByPlan: flags.coveredByPlan,
    coveredPlanCode: flags.coveredPlanCode,
    billingOverrideState: r.billing_override_state
      ? (String(r.billing_override_state) as any)
      : null,
  };
}

export async function listAgentQueue(): Promise<AgentTicketListItem[]> {
  const rows = await query<any>(
    `SELECT t.id, t.status, t.priority, t.category, t.subject, t.created_at, t.updated_at, t.assigned_agent_id,
            t.incident_type_selected, a.agent_alias,
            q.amount AS quote_amount, q.currency AS quote_currency,
            acc.type AS account_type, acc.billing_status AS account_billing_status,
            s.plan_code AS covered_plan_code, s.status AS subscription_status,
            (
              SELECT p.status
                FROM payments p
               WHERE p.ticket_id = t.id AND p.type='incident'
               ORDER BY p.created_at DESC
               LIMIT 1
            ) AS latest_payment_status,
            EXISTS(
              SELECT 1 FROM payments p2
               WHERE p2.ticket_id = t.id AND p2.type='incident' AND p2.status='succeeded'
            ) AS has_paid,
            (
              SELECT tbo.state FROM ticket_billing_overrides tbo
               WHERE tbo.ticket_id = t.id
               ORDER BY tbo.updated_at DESC, tbo.created_at DESC
               LIMIT 1
            ) AS billing_override_state
       FROM tickets t
       JOIN ticket_aliases a ON a.ticket_id = t.id
  LEFT JOIN ticket_quotes q ON q.ticket_id = t.id
  LEFT JOIN accounts acc ON acc.id = t.account_id
  LEFT JOIN subscriptions s ON s.account_id = t.account_id
      WHERE t.assigned_agent_id IS NULL
        AND t.status IN ('open','in_progress','waiting_customer')
      ORDER BY t.created_at DESC
      LIMIT 200`,
  );

  return rows.map(mapAgentTicketRow);
}

export async function listAgentMine(
  agentId: string,
): Promise<AgentTicketListItem[]> {
  const rows = await query<any>(
    `SELECT t.id, t.status, t.priority, t.category, t.subject, t.created_at, t.updated_at, t.assigned_agent_id,
            t.incident_type_selected, a.agent_alias,
            q.amount AS quote_amount, q.currency AS quote_currency,
            acc.type AS account_type, acc.billing_status AS account_billing_status,
            s.plan_code AS covered_plan_code, s.status AS subscription_status,
            (
              SELECT p.status
                FROM payments p
               WHERE p.ticket_id = t.id AND p.type='incident'
               ORDER BY p.created_at DESC
               LIMIT 1
            ) AS latest_payment_status,
            EXISTS(
              SELECT 1 FROM payments p2
               WHERE p2.ticket_id = t.id AND p2.type='incident' AND p2.status='succeeded'
            ) AS has_paid,
            (
              SELECT tbo.state FROM ticket_billing_overrides tbo
               WHERE tbo.ticket_id = t.id
               ORDER BY tbo.updated_at DESC, tbo.created_at DESC
               LIMIT 1
            ) AS billing_override_state
       FROM tickets t
       JOIN ticket_aliases a ON a.ticket_id = t.id
  LEFT JOIN ticket_quotes q ON q.ticket_id = t.id
  LEFT JOIN accounts acc ON acc.id = t.account_id
  LEFT JOIN subscriptions s ON s.account_id = t.account_id
      WHERE t.assigned_agent_id = ?
        AND t.status IN ('open','in_progress','waiting_customer','resolved')
      ORDER BY t.updated_at DESC
      LIMIT 200`,
    [agentId],
  );

  return rows.map(mapAgentTicketRow);
}

export async function getAgentTicket(
  ticketId: string,
): Promise<(TicketRow & { agentAlias: string }) | null> {
  const rows = await query<any>(
    `SELECT t.*, a.agent_alias
       FROM tickets t
       JOIN ticket_aliases a ON a.ticket_id = t.id
      WHERE t.id = ?
      LIMIT 1`,
    [ticketId],
  );
  return rows[0] ? (rows[0] as any) : null;
}

export async function getTicketAssignedAgent(
  ticketId: string,
): Promise<string | null> {
  const rows = await query<{ assigned_agent_id: string | null }>(
    `SELECT assigned_agent_id FROM tickets WHERE id = ? LIMIT 1`,
    [ticketId],
  );
  if (!rows[0]) return null;
  return rows[0].assigned_agent_id;
}

export async function claimTicket(params: {
  ticketId: string;
  agentId: string;
}): Promise<"ok" | "not_found" | "already_assigned"> {
  const { ticketId, agentId } = params;
  const rows = await query<{ assigned_agent_id: string | null }>(
    `SELECT assigned_agent_id FROM tickets WHERE id = ? LIMIT 1`,
    [ticketId],
  );
  if (!rows[0]) return "not_found";
  if (rows[0].assigned_agent_id) return "already_assigned";

  const packet = await exec(
    `UPDATE tickets
        SET assigned_agent_id = ?, status = 'in_progress', updated_at = NOW()
      WHERE id = ? AND assigned_agent_id IS NULL`,
    [agentId, ticketId],
  );

  return Number(packet?.affectedRows ?? 0) === 1 ? "ok" : "already_assigned";
}
