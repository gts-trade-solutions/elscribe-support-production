import { exec, query, transaction } from "@/lib/db";
import { getCompanyPlanByCode } from "@/lib/billing/pricing";

export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "past_due"
  | "canceled";

export type SubscriptionRow = {
  accountId: string;
  provider: string | null;
  planCode: string | null;
  seatLimitSnapshot: number;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  metadataJson: any | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountPlanCoverage = {
  accountId: string;
  accountType: string | null;
  billingStatus: string | null;
  planCode: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  coveredByPlan: boolean;
};

export function hasCompanyPlanCoverage(args: {
  accountType?: string | null;
  billingStatus?: string | null;
  planCode?: string | null;
  subscriptionStatus?: string | null;
}) {
  return Boolean(
    String(args.accountType || "") === "company" &&
    String(args.billingStatus || "") === "active" &&
    String(args.subscriptionStatus || "") === "active" &&
    getCompanyPlanByCode(args.planCode ?? null),
  );
}

function parseMetadata(value: any) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function mapSubscription(r: any): SubscriptionRow {
  return {
    accountId: String(r.account_id),
    provider: r.provider ? String(r.provider) : null,
    planCode: r.plan_code ? String(r.plan_code) : null,
    seatLimitSnapshot: Number(r.seat_limit_snapshot ?? 1),
    status: String(r.status || "inactive") as SubscriptionStatus,
    currentPeriodStart: r.current_period_start
      ? new Date(r.current_period_start).toISOString()
      : null,
    currentPeriodEnd: r.current_period_end
      ? new Date(r.current_period_end).toISOString()
      : null,
    metadataJson: parseMetadata(r.metadata_json),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : "",
  };
}

export async function getAccountSubscription(
  accountId: string,
): Promise<SubscriptionRow | null> {
  const rows: any[] = await query(
    `SELECT account_id, provider, plan_code, seat_limit_snapshot, status,
            current_period_start, current_period_end, metadata_json,
            created_at, updated_at
       FROM subscriptions
      WHERE account_id = ?
      LIMIT 1`,
    [accountId],
  );
  return rows[0] ? mapSubscription(rows[0]) : null;
}

export async function upsertAccountSubscription(args: {
  accountId: string;
  provider?: string | null;
  planCode: string | null;
  seatLimitSnapshot: number;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  metadataJson?: any | null;
}) {
  await exec(
    `INSERT INTO subscriptions
      (account_id, provider, plan_code, seat_limit_snapshot, status, current_period_start, current_period_end, metadata_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       provider = VALUES(provider),
       plan_code = VALUES(plan_code),
       seat_limit_snapshot = VALUES(seat_limit_snapshot),
       status = VALUES(status),
       current_period_start = VALUES(current_period_start),
       current_period_end = VALUES(current_period_end),
       metadata_json = VALUES(metadata_json),
       updated_at = NOW()`,
    [
      args.accountId,
      args.provider ?? "razorpay",
      args.planCode,
      args.seatLimitSnapshot,
      args.status,
      args.currentPeriodStart,
      args.currentPeriodEnd,
      args.metadataJson ? JSON.stringify(args.metadataJson) : null,
    ],
  );
}

export async function applyCompanyPlanEntitlement(args: {
  accountId: string;
  planCode: string;
  provider?: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  metadataJson?: any | null;
}) {
  const plan = getCompanyPlanByCode(args.planCode);
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  await transaction(async (tx) => {
    await tx.exec(
      `UPDATE accounts
          SET seat_limit = ?,
              plan_code = ?,
              billing_status = 'active',
              updated_at = NOW()
        WHERE id = ?`,
      [plan.seatLimit, plan.code, args.accountId],
    );

    await tx.exec(
      `INSERT INTO subscriptions
        (account_id, provider, plan_code, seat_limit_snapshot, status, current_period_start, current_period_end, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         provider = VALUES(provider),
         plan_code = VALUES(plan_code),
         seat_limit_snapshot = VALUES(seat_limit_snapshot),
         status = 'active',
         current_period_start = VALUES(current_period_start),
         current_period_end = VALUES(current_period_end),
         metadata_json = VALUES(metadata_json),
         updated_at = NOW()`,
      [
        args.accountId,
        args.provider ?? "razorpay",
        plan.code,
        plan.seatLimit,
        args.currentPeriodStart,
        args.currentPeriodEnd,
        args.metadataJson ? JSON.stringify(args.metadataJson) : null,
      ],
    );
  });
}

export async function markCompanyEntitlementExpired(accountId: string) {
  await transaction(async (tx) => {
    await tx.exec(
      `UPDATE accounts
          SET seat_limit = 1,
              billing_status = 'past_due',
              updated_at = NOW()
        WHERE id = ?`,
      [accountId],
    );
    await tx.exec(
      `UPDATE subscriptions
          SET status = 'past_due',
              updated_at = NOW()
        WHERE account_id = ?`,
      [accountId],
    );
  });
}

export async function getAccountPlanCoverage(
  accountId: string,
): Promise<AccountPlanCoverage | null> {
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
  if (!row) return null;

  const accountType = row.account_type ? String(row.account_type) : null;
  const billingStatus = row.billing_status ? String(row.billing_status) : null;
  const planCode = row.plan_code ? String(row.plan_code) : null;
  const subscriptionStatus = row.subscription_status
    ? (String(row.subscription_status) as SubscriptionStatus)
    : null;
  const currentPeriodStart = row.current_period_start
    ? new Date(row.current_period_start).toISOString()
    : null;
  const currentPeriodEnd = row.current_period_end
    ? new Date(row.current_period_end).toISOString()
    : null;

  return {
    accountId: String(row.account_id),
    accountType,
    billingStatus,
    planCode,
    subscriptionStatus,
    currentPeriodStart,
    currentPeriodEnd,
    coveredByPlan: hasCompanyPlanCoverage({
      accountType,
      billingStatus,
      planCode,
      subscriptionStatus,
    }),
  };
}

export async function syncAccountSubscriptionEntitlement(accountId: string) {
  const subscription = await getAccountSubscription(accountId);
  if (!subscription) return null;

  if (
    subscription.status === "active" &&
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd).getTime() < Date.now()
  ) {
    await markCompanyEntitlementExpired(accountId);
    return getAccountSubscription(accountId);
  }

  return subscription;
}
