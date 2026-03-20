import { getPool, rawQuery } from "@/lib/db";
import {
  getCompanyPlanByCode,
  getDisplayCurrency,
  getIncidentByCode,
  getProcessorCurrency,
} from "@/lib/billing/pricing";

export type AdminPaymentStatusFilter =
  | "all"
  | "pending"
  | "succeeded"
  | "failed"
  | "refunded";

export type AdminPaymentTypeFilter = "all" | "incident" | "subscription";

export type AdminPaymentListItem = {
  id: string;
  accountId: string;
  accountType: "individual" | "company" | null;
  accountBillingStatus: string | null;
  ticketId: string | null;
  planCode: string | null;
  type: "incident" | "subscription";
  status: "pending" | "succeeded" | "failed" | "refunded";
  provider: string;
  processorAmount: number;
  processorCurrency: string;
  displayAmount: number;
  displayCurrency: string;
  createdAt: string;
  updatedAt: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  ticketSubject: string | null;
  incidentTypeSelected: string | null;
  agentAlias: string | null;
  creatorEmail: string | null;
};

export type AdminPaymentMetrics = {
  totalTransactions: number;
  succeededTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;
  incidentTransactions: number;
  subscriptionTransactions: number;
  succeededDisplayAmount: number;
  succeededDisplayCurrency: string;
  succeededProcessorAmount: number;
  succeededProcessorCurrency: string;
  incidentSucceededDisplayAmount: number;
  subscriptionSucceededDisplayAmount: number;
  pendingProcessorAmount: number;
  successRatePercent: number;
};

export type AdminPaymentFilters = {
  status?: AdminPaymentStatusFilter;
  type?: AdminPaymentTypeFilter;
  search?: string | null;
  limit?: number;
};

function esc(value: any) {
  return getPool().escape(value);
}

function getSafeLimit(limit?: number, fallback = 200) {
  const n = Number(limit ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), 1), 1000);
}

function deriveDisplayAmount(row: any) {
  if (row.display_amount != null) {
    return {
      amount: Number(row.display_amount),
      currency: String(row.display_currency || getDisplayCurrency()),
    };
  }

  if (row.type === "incident") {
    const incident = getIncidentByCode(row.incident_type_selected);
    if (incident?.amount != null) {
      return {
        amount: Number(incident.amount),
        currency: getDisplayCurrency(),
      };
    }
  }

  if (row.type === "subscription") {
    const plan = getCompanyPlanByCode(row.plan_code);
    if (plan) {
      return {
        amount: Number(plan.priceMonthlyUsd),
        currency: getDisplayCurrency(),
      };
    }
  }

  return {
    amount: Number(row.amount ?? 0),
    currency: String(row.currency || getProcessorCurrency()),
  };
}

function mapRow(row: any): AdminPaymentListItem {
  const display = deriveDisplayAmount(row);
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    accountType: row.account_type ?? null,
    accountBillingStatus: row.account_billing_status
      ? String(row.account_billing_status)
      : null,
    ticketId: row.ticket_id ? String(row.ticket_id) : null,
    planCode: row.plan_code ? String(row.plan_code) : null,
    type: row.type,
    status: row.status,
    provider: String(row.provider || "razorpay"),
    processorAmount: Number(row.amount ?? 0),
    processorCurrency: String(row.currency || getProcessorCurrency()),
    displayAmount: display.amount,
    displayCurrency: display.currency,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : "",
    razorpayOrderId: row.razorpay_order_id
      ? String(row.razorpay_order_id)
      : null,
    razorpayPaymentId: row.razorpay_payment_id
      ? String(row.razorpay_payment_id)
      : null,
    ticketSubject: row.ticket_subject ? String(row.ticket_subject) : null,
    incidentTypeSelected: row.incident_type_selected
      ? String(row.incident_type_selected)
      : null,
    agentAlias: row.agent_alias ? String(row.agent_alias) : null,
    creatorEmail: row.creator_email ? String(row.creator_email) : null,
  };
}

function buildWhere(filters: AdminPaymentFilters) {
  const where: string[] = [];

  if (filters.status && filters.status !== "all") {
    where.push(`p.status = ${esc(filters.status)}`);
  }
  if (filters.type && filters.type !== "all") {
    where.push(`p.type = ${esc(filters.type)}`);
  }

  const search = String(filters.search || "").trim();
  if (search) {
    const exact = esc(search);
    const like = esc(`%${search}%`);
    where.push(`(
      p.id = ${exact}
      OR p.account_id = ${exact}
      OR p.ticket_id = ${exact}
      OR p.razorpay_order_id = ${exact}
      OR p.razorpay_payment_id = ${exact}
      OR p.plan_code = ${exact}
      OR creator.email LIKE ${like}
      OR t.subject LIKE ${like}
      OR ta.agent_alias LIKE ${like}
    )`);
  }

  return where;
}

function baseSql(where: string[], limit?: number) {
  return `SELECT
      p.id,
      p.account_id,
      p.ticket_id,
      p.plan_code,
      p.type,
      p.status,
      p.amount,
      p.display_amount,
      p.currency,
      p.display_currency,
      p.provider,
      p.razorpay_order_id,
      p.razorpay_payment_id,
      p.created_at,
      p.updated_at,
      acc.type AS account_type,
      acc.billing_status AS account_billing_status,
      t.subject AS ticket_subject,
      t.incident_type_selected,
      ta.agent_alias,
      creator.email AS creator_email
    FROM payments p
    LEFT JOIN accounts acc ON acc.id = p.account_id
    LEFT JOIN tickets t ON t.id = p.ticket_id
    LEFT JOIN ticket_aliases ta ON ta.ticket_id = t.id
    LEFT JOIN users creator ON creator.id = t.created_by_user_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY p.created_at DESC, p.id DESC
    ${typeof limit === "number" ? `LIMIT ${getSafeLimit(limit)}` : ""}`;
}

export async function listAdminPayments(
  filters: AdminPaymentFilters = {},
): Promise<AdminPaymentListItem[]> {
  const rows = await rawQuery<any>(
    baseSql(buildWhere(filters), filters.limit ?? 300),
  );
  return rows.map(mapRow);
}

export async function getAdminPaymentMetrics(): Promise<AdminPaymentMetrics> {
  const rows = await rawQuery<any>(baseSql([], undefined));
  const items = rows.map(mapRow);

  const totalTransactions = items.length;
  const succeeded = items.filter((p) => p.status === "succeeded");
  const pending = items.filter((p) => p.status === "pending");
  const failed = items.filter((p) => p.status === "failed");
  const refunded = items.filter((p) => p.status === "refunded");
  const incident = items.filter((p) => p.type === "incident");
  const subscription = items.filter((p) => p.type === "subscription");

  const sum = (
    arr: AdminPaymentListItem[],
    field: "displayAmount" | "processorAmount",
  ) => arr.reduce((acc, item) => acc + Number(item[field] ?? 0), 0);

  return {
    totalTransactions,
    succeededTransactions: succeeded.length,
    pendingTransactions: pending.length,
    failedTransactions: failed.length,
    refundedTransactions: refunded.length,
    incidentTransactions: incident.length,
    subscriptionTransactions: subscription.length,
    succeededDisplayAmount: sum(succeeded, "displayAmount"),
    succeededDisplayCurrency: getDisplayCurrency(),
    succeededProcessorAmount: sum(succeeded, "processorAmount"),
    succeededProcessorCurrency: getProcessorCurrency(),
    incidentSucceededDisplayAmount: sum(
      succeeded.filter((p) => p.type === "incident"),
      "displayAmount",
    ),
    subscriptionSucceededDisplayAmount: sum(
      succeeded.filter((p) => p.type === "subscription"),
      "displayAmount",
    ),
    pendingProcessorAmount: sum(pending, "processorAmount"),
    successRatePercent:
      totalTransactions > 0
        ? Math.round((succeeded.length / totalTransactions) * 1000) / 10
        : 0,
  };
}
