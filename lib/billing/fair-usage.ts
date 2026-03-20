import { query } from "@/lib/db";
import { getCompanyPlanByCode } from "@/lib/billing/pricing";
import { syncAccountSubscriptionEntitlement } from "@/lib/billing/subscription-repo";

export type CompanyFairUsageSnapshot = {
  applies: boolean;
  accountId: string;
  planCode: string | null;
  status: string | null;
  limit: number | null;
  used: number;
  remaining: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
};

function normalizeIso(value: any): string | null {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

export async function getCompanyTicketFairUsageSnapshot(
  accountId: string,
): Promise<CompanyFairUsageSnapshot> {
  await syncAccountSubscriptionEntitlement(accountId);

  const rows: any[] = await query(
    `SELECT a.id AS account_id,
            a.type AS account_type,
            a.billing_status AS billing_status,
            s.plan_code,
            s.status AS subscription_status,
            s.current_period_start,
            s.current_period_end
       FROM accounts a
  LEFT JOIN subscriptions s ON s.account_id = a.id
      WHERE a.id = ?
      LIMIT 1`,
    [accountId],
  );

  const row = rows[0];
  if (!row || String(row.account_type) !== "company") {
    return {
      applies: false,
      accountId,
      planCode: null,
      status: null,
      limit: null,
      used: 0,
      remaining: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    };
  }

  const status = row.subscription_status
    ? String(row.subscription_status)
    : null;
  const planCode = row.plan_code ? String(row.plan_code) : null;
  const plan = getCompanyPlanByCode(planCode);
  const periodStart = normalizeIso(row.current_period_start);
  const periodEnd = normalizeIso(row.current_period_end);

  const applies = Boolean(
    String(row.billing_status || "") === "active" &&
    status === "active" &&
    plan &&
    periodStart &&
    periodEnd,
  );

  if (!applies || !plan || !periodStart || !periodEnd) {
    return {
      applies: false,
      accountId,
      planCode,
      status,
      limit: plan?.fairUsageTicketLimit ?? null,
      used: 0,
      remaining: plan?.fairUsageTicketLimit ?? null,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    };
  }

  const countRows: any[] = await query(
    `SELECT COUNT(*) AS c
       FROM tickets
      WHERE account_id = ?
        AND created_at >= ?
        AND created_at < ?`,
    [accountId, new Date(periodStart), new Date(periodEnd)],
  );

  const used = Number(countRows[0]?.c ?? 0);
  const limit = plan.fairUsageTicketLimit;
  return {
    applies: true,
    accountId,
    planCode,
    status,
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  };
}
