import { exec, query, rawQuery } from "@/lib/db";
import { getIncidentByCode } from "@/lib/billing/pricing";
import { hasCompanyPlanCoverage } from "@/lib/billing/subscription-repo";
import { getPool } from "@/lib/db";
import type { TicketPriority, TicketStatus } from "@/lib/ticket-repo";
import {
  clearTicketBillingOverride,
  upsertTicketBillingOverride,
} from "@/lib/billing/override-repo";

export type AdminUserRoleFilter = "agent" | "customer" | "admin";

export type AdminUserListItem = {
  id: string;
  email: string;
  role: "customer" | "agent" | "admin";
  isGuest: boolean;
  activeAccountId: string | null;
  activeAccountType: "individual" | "company" | null;
  membershipRole: "owner" | "member" | null;
  planCode: string | null;
  billingStatus: string | null;
  seatLimit: number | null;
  createdAt: string;
  openAssignedTickets: number;
  createdTickets: number;
  latestAgentDecisionNote: string | null;
};

export type AdminTicketListItem = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  accountId: string;
  accountType: "individual" | "company";
  creatorEmail: string;
  creatorUserId: string;
  assignedAgentId: string | null;
  assignedAgentEmail: string | null;
  agentAlias: string;
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
  billingOverrideNote: string | null;
  hasMagicLink: boolean;
  hasActiveMagicLink: boolean;
  awaitingResponse: boolean;
};

export type AdminTicketFilters = {
  status?: string | null;
  assignment?: "all" | "assigned" | "unassigned";
  billing?: "all" | "blocked" | "included" | "paid" | "quote_pending";
  search?: string | null;
  limit?: number;
};

export type AdminMetrics = {
  totalCustomers: number;
  totalAgents: number;
  totalAdmins: number;
  totalTickets: number;
  unassignedTickets: number;
  planCoveredTickets: number;
  billingBlockedTickets: number;
};

function getSafeLimit(limit?: number, fallback = 200) {
  const n = Number(limit ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), 1), 500);
}

function esc(value: any) {
  return getPool().escape(value);
}

function deriveBillingFlags(args: {
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

export async function listAdminUsers(params: {
  role?: AdminUserRoleFilter | null;
  search?: string | null;
  limit?: number;
  includeGuests?: boolean;
}): Promise<AdminUserListItem[]> {
  const where: string[] = [];

  if (params.role) where.push(`u.role = ${esc(params.role)}`);

  if (!params.includeGuests) {
    where.push(`u.is_guest = 0`);
  }

  const search = params.search?.trim();
  if (search) {
    const like = esc(`%${search}%`);
    const exact = esc(search);
    where.push(`(u.email LIKE ${like} OR u.id = ${exact})`);
  }

  const sql = `SELECT u.id,
      u.email,
      u.role,
      u.is_guest AS isGuest,
      u.created_at AS createdAt,
      (
        SELECT m.account_id
          FROM account_memberships m
          JOIN accounts a ON a.id = m.account_id
         WHERE m.user_id = u.id AND m.status = 'active'
         ORDER BY (a.type = 'company') DESC,
                  (m.membership_role = 'owner') DESC,
                  m.created_at ASC
         LIMIT 1
      ) AS activeAccountId,
      (
        SELECT a.type
          FROM account_memberships m
          JOIN accounts a ON a.id = m.account_id
         WHERE m.user_id = u.id AND m.status = 'active'
         ORDER BY (a.type = 'company') DESC,
                  (m.membership_role = 'owner') DESC,
                  m.created_at ASC
         LIMIT 1
      ) AS activeAccountType,
      (
        SELECT m.membership_role
          FROM account_memberships m
          JOIN accounts a ON a.id = m.account_id
         WHERE m.user_id = u.id AND m.status = 'active'
         ORDER BY (a.type = 'company') DESC,
                  (m.membership_role = 'owner') DESC,
                  m.created_at ASC
         LIMIT 1
      ) AS membershipRole,
      (
        SELECT a.plan_code
          FROM account_memberships m
          JOIN accounts a ON a.id = m.account_id
         WHERE m.user_id = u.id AND m.status = 'active'
         ORDER BY (a.type = 'company') DESC,
                  (m.membership_role = 'owner') DESC,
                  m.created_at ASC
         LIMIT 1
      ) AS planCode,
      (
        SELECT a.billing_status
          FROM account_memberships m
          JOIN accounts a ON a.id = m.account_id
         WHERE m.user_id = u.id AND m.status = 'active'
         ORDER BY (a.type = 'company') DESC,
                  (m.membership_role = 'owner') DESC,
                  m.created_at ASC
         LIMIT 1
      ) AS billingStatus,
      (
        SELECT a.seat_limit
          FROM account_memberships m
          JOIN accounts a ON a.id = m.account_id
         WHERE m.user_id = u.id AND m.status = 'active'
         ORDER BY (a.type = 'company') DESC,
                  (m.membership_role = 'owner') DESC,
                  m.created_at ASC
         LIMIT 1
      ) AS seatLimit,
      (
        SELECT COUNT(*)
          FROM tickets t
         WHERE t.assigned_agent_id = u.id
           AND t.status IN ('open','in_progress','waiting_customer','resolved')
      ) AS openAssignedTickets,
      (
        SELECT COUNT(*)
          FROM tickets t
         WHERE t.created_by_user_id = u.id
      ) AS createdTickets,
      (
        SELECT arr.decision_note
          FROM agent_role_requests arr
         WHERE arr.user_id = u.id
           AND arr.status IN ('approved','rejected')
         ORDER BY COALESCE(arr.decided_at, arr.created_at) DESC,
                  arr.created_at DESC
         LIMIT 1
      ) AS latestAgentDecisionNote
    FROM users u
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY u.created_at DESC
    LIMIT ${getSafeLimit(params.limit, 200)}`;

  const rows = await rawQuery<any>(sql);
  return rows.map((r) => ({
    id: String(r.id),
    email: String(r.email),
    role: r.role,
    isGuest: Number(r.isGuest) === 1,
    activeAccountId: r.activeAccountId ? String(r.activeAccountId) : null,
    activeAccountType: r.activeAccountType ?? null,
    membershipRole: r.membershipRole ?? null,
    planCode: r.planCode ? String(r.planCode) : null,
    billingStatus: r.billingStatus ? String(r.billingStatus) : null,
    seatLimit: r.seatLimit == null ? null : Number(r.seatLimit),
    createdAt: new Date(r.createdAt).toISOString(),
    openAssignedTickets: Number(r.openAssignedTickets ?? 0),
    createdTickets: Number(r.createdTickets ?? 0),
    latestAgentDecisionNote: r.latestAgentDecisionNote
      ? String(r.latestAgentDecisionNote)
      : null,
  }));
}

function mapAdminTicketRow(r: any): AdminTicketListItem {
  const isPaid = Number(r.has_paid) === 1;
  const incidentTypeSelected = r.incident_type_selected
    ? String(r.incident_type_selected)
    : null;
  const flags = deriveBillingFlags({
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
    id: String(r.id),
    subject: String(r.subject),
    status: r.status,
    priority: r.priority,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    accountId: String(r.account_id),
    accountType: r.account_type,
    creatorEmail: String(r.creator_email),
    creatorUserId: String(r.created_by_user_id),
    assignedAgentId: r.assigned_agent_id ? String(r.assigned_agent_id) : null,
    assignedAgentEmail: r.assigned_agent_email
      ? String(r.assigned_agent_email)
      : null,
    agentAlias: String(r.agent_alias),
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
    billingOverrideNote: r.billing_override_note
      ? String(r.billing_override_note)
      : null,
    hasMagicLink: Number(r.has_magic_link) === 1,
    hasActiveMagicLink: Number(r.has_active_magic_link) === 1,
    awaitingResponse: Number(r.awaiting_agent_response) === 1,
  };
}

export async function listAdminTickets(
  filters: AdminTicketFilters = {},
): Promise<AdminTicketListItem[]> {
  const where: string[] = [];

  if (filters.status && filters.status !== "all") {
    where.push(`t.status = ${esc(filters.status)}`);
  }
  if (filters.assignment === "assigned") {
    where.push("t.assigned_agent_id IS NOT NULL");
  } else if (filters.assignment === "unassigned") {
    where.push("t.assigned_agent_id IS NULL");
  }

  const search = filters.search?.trim();
  if (search) {
    const exact = esc(search);
    const like = esc(`%${search}%`);
    where.push(
      `(t.id = ${exact} OR t.subject LIKE ${like} OR ta.agent_alias LIKE ${like} OR creator.email LIKE ${like} OR assigned.email LIKE ${like})`,
    );
  }

  const sql = `SELECT t.id,
      t.account_id,
      t.created_by_user_id,
      t.assigned_agent_id,
      t.status,
      t.priority,
      t.subject,
      t.created_at,
      t.updated_at,
      t.incident_type_selected,
      ta.agent_alias,
      creator.email AS creator_email,
      assigned.email AS assigned_agent_email,
      (
        SELECT tq.amount
          FROM ticket_quotes tq
         WHERE tq.ticket_id = t.id
         ORDER BY tq.updated_at DESC, tq.created_at DESC, tq.id DESC
         LIMIT 1
      ) AS quote_amount,
      (
        SELECT tq.currency
          FROM ticket_quotes tq
         WHERE tq.ticket_id = t.id
         ORDER BY tq.updated_at DESC, tq.created_at DESC, tq.id DESC
         LIMIT 1
      ) AS quote_currency,
      acc.type AS account_type,
      acc.billing_status AS account_billing_status,
      (
        SELECT s.plan_code
          FROM subscriptions s
         WHERE s.account_id = t.account_id
         ORDER BY COALESCE(s.current_period_end, s.updated_at, s.created_at) DESC,
                  s.updated_at DESC,
                  s.created_at DESC
         LIMIT 1
      ) AS covered_plan_code,
      (
        SELECT s.status
          FROM subscriptions s
         WHERE s.account_id = t.account_id
         ORDER BY COALESCE(s.current_period_end, s.updated_at, s.created_at) DESC,
                  s.updated_at DESC,
                  s.created_at DESC
         LIMIT 1
      ) AS subscription_status,
      (
        SELECT p.status
          FROM payments p
         WHERE p.type = 'incident' AND p.ticket_id = t.id
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT 1
      ) AS latest_payment_status,
      CASE WHEN EXISTS(
        SELECT 1 FROM payments p
         WHERE p.type = 'incident' AND p.status = 'succeeded' AND p.ticket_id = t.id
      ) THEN 1 ELSE 0 END AS has_paid,
      (
        SELECT tbo.state
          FROM ticket_billing_overrides tbo
         WHERE tbo.ticket_id = t.id
         ORDER BY tbo.updated_at DESC, tbo.created_at DESC
         LIMIT 1
      ) AS billing_override_state,
      (
        SELECT tbo.note
          FROM ticket_billing_overrides tbo
         WHERE tbo.ticket_id = t.id
         ORDER BY tbo.updated_at DESC, tbo.created_at DESC
         LIMIT 1
      ) AS billing_override_note,
      CASE WHEN EXISTS(
        SELECT 1 FROM ticket_magic_links l
         WHERE l.ticket_id = t.id
      ) THEN 1 ELSE 0 END AS has_magic_link,
      CASE WHEN EXISTS(
        SELECT 1 FROM ticket_magic_links l
         WHERE l.ticket_id = t.id
           AND l.revoked_at IS NULL
           AND l.expires_at > UTC_TIMESTAMP()
      ) THEN 1 ELSE 0 END AS has_active_magic_link,
      CASE WHEN EXISTS(
        SELECT 1 FROM payments p2
         WHERE p2.ticket_id = t.id AND p2.type='incident' AND p2.status='succeeded'
      ) AND NOT EXISTS(
        SELECT 1 FROM ticket_messages tm
         WHERE tm.ticket_id = t.id
           AND tm.sender_role IN ('agent','admin')
           AND tm.created_at > (
             SELECT MAX(p3.updated_at) FROM payments p3
              WHERE p3.ticket_id = t.id AND p3.type='incident' AND p3.status='succeeded'
           )
      ) THEN 1 ELSE 0 END AS awaiting_agent_response
    FROM tickets t
    JOIN ticket_aliases ta ON ta.ticket_id = t.id
    JOIN users creator ON creator.id = t.created_by_user_id
    LEFT JOIN users assigned ON assigned.id = t.assigned_agent_id
    LEFT JOIN accounts acc ON acc.id = t.account_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY awaiting_agent_response DESC, t.updated_at DESC
    LIMIT ${getSafeLimit(filters.limit, 200)}`;

  let items = (await rawQuery<any>(sql)).map(mapAdminTicketRow);

  if (filters.billing && filters.billing !== "all") {
    items = items.filter((item) => {
      if (filters.billing === "included") return item.coveredByPlan;
      if (filters.billing === "paid") return item.isPaid;
      if (filters.billing === "quote_pending") return item.quoteRequired;
      if (filters.billing === "blocked") {
        return (
          item.billingOverrideState === "blocked" ||
          item.paymentRequired ||
          item.quoteRequired ||
          (!item.coveredByPlan && !item.isPaid && !item.incidentTypeSelected)
        );
      }
      return true;
    });
  }

  return items;
}

export async function listAssignableOperators(): Promise<
  Array<{ id: string; email: string; role: "agent" | "admin" }>
> {
  const rows = await rawQuery<any>(
    `SELECT id, email, role FROM users WHERE role IN ('agent','admin') ORDER BY (role = 'admin') ASC, email ASC`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    email: String(r.email),
    role: r.role,
  }));
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const [userCounts, ticketCounts, allTickets] = await Promise.all([
    rawQuery<any>(`SELECT role, COUNT(*) AS c FROM users GROUP BY role`),
    rawQuery<any>(
      `SELECT COUNT(*) AS totalTickets, SUM(CASE WHEN assigned_agent_id IS NULL THEN 1 ELSE 0 END) AS unassignedTickets FROM tickets`,
    ),
    listAdminTickets({ limit: 500, billing: "all" }),
  ]);

  return {
    totalCustomers: Number(
      userCounts.find((r) => r.role === "customer")?.c ?? 0,
    ),
    totalAgents: Number(userCounts.find((r) => r.role === "agent")?.c ?? 0),
    totalAdmins: Number(userCounts.find((r) => r.role === "admin")?.c ?? 0),
    totalTickets: Number(ticketCounts[0]?.totalTickets ?? 0),
    unassignedTickets: Number(ticketCounts[0]?.unassignedTickets ?? 0),
    planCoveredTickets: allTickets.filter((t) => t.coveredByPlan).length,
    billingBlockedTickets: allTickets.filter(
      (t) =>
        t.billingOverrideState === "blocked" ||
        t.paymentRequired ||
        t.quoteRequired ||
        (!t.coveredByPlan && !t.isPaid && !t.incidentTypeSelected),
    ).length,
  };
}

export async function updateAdminManagedTicket(params: {
  ticketId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedAgentId?: string | null;
  billingOverrideState?: "system" | "cleared" | "blocked";
  billingOverrideNote?: string | null;
  updatedByUserId?: string;
}): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];

  if (params.priority) {
    fields.push("priority = ?");
    values.push(params.priority);
  }

  if (params.assignedAgentId !== undefined) {
    if (params.assignedAgentId === null) {
      fields.push("assigned_agent_id = NULL");
      if (!params.status) {
        fields.push(
          "status = CASE WHEN status IN ('in_progress','waiting_customer') THEN 'open' ELSE status END",
        );
      }
    } else {
      const operatorRows = await query<{ id: string }>(
        `SELECT id FROM users WHERE id = ? AND role IN ('agent','admin') LIMIT 1`,
        [params.assignedAgentId],
      );
      if (!operatorRows[0]) throw new Error("ASSIGNEE_NOT_FOUND");
      fields.push("assigned_agent_id = ?");
      values.push(params.assignedAgentId);
      if (!params.status) {
        fields.push(
          "status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END",
        );
      }
    }
  }

  if (params.status) {
    fields.push("status = ?");
    values.push(params.status);
  }

  let ok = true;

  if (fields.length) {
    const packet = await exec(
      `UPDATE tickets SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
      [...values, params.ticketId],
    );
    ok = Number(packet?.affectedRows ?? 0) === 1;
    if (!ok) return false;
  }

  if (params.billingOverrideState !== undefined) {
    if (params.billingOverrideState === "system") {
      await clearTicketBillingOverride(params.ticketId);
    } else {
      await upsertTicketBillingOverride({
        ticketId: params.ticketId,
        state: params.billingOverrideState,
        note: params.billingOverrideNote ?? null,
        updatedByUserId: params.updatedByUserId || "admin",
      });
    }
  }

  return ok;
}
