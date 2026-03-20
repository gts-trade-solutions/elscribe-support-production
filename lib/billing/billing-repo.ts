import { exec, query } from "@/lib/db";

export type BillingCustomerRow = {
  accountId: string;
  savedCardEnabled: boolean;
  razorpayCustomerId: string | null;
  razorpayTokenId: string | null;
};

export type PaymentType = "incident" | "subscription";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export type PaymentRow = {
  id: string;
  accountId: string;
  ticketId: string | null;
  planCode: string | null;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  currency: string;
  displayAmount: number | null;
  displayCurrency: string | null;
  provider: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapPayment(r: any): PaymentRow {
  return {
    id: String(r.id),
    accountId: String(r.account_id),
    ticketId: r.ticket_id ? String(r.ticket_id) : null,
    planCode: r.plan_code ? String(r.plan_code) : null,
    type: r.type as PaymentType,
    status: r.status as PaymentStatus,
    amount: Number(r.amount),
    currency: String(r.currency),
    displayAmount: r.display_amount == null ? null : Number(r.display_amount),
    displayCurrency: r.display_currency ? String(r.display_currency) : null,
    provider: String(r.provider || "razorpay"),
    razorpayOrderId: r.razorpay_order_id ? String(r.razorpay_order_id) : null,
    razorpayPaymentId: r.razorpay_payment_id
      ? String(r.razorpay_payment_id)
      : null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : "",
  };
}

export async function getBillingCustomer(
  accountId: string,
): Promise<BillingCustomerRow | null> {
  const rows: any[] = await query(
    `SELECT account_id, saved_card_enabled, razorpay_customer_id, razorpay_token_id
       FROM billing_customers
      WHERE account_id = ?
      LIMIT 1`,
    [accountId],
  );
  if (!rows[0]) return null;
  return {
    accountId: String(rows[0].account_id),
    savedCardEnabled: Number(rows[0].saved_card_enabled) === 1,
    razorpayCustomerId: rows[0].razorpay_customer_id
      ? String(rows[0].razorpay_customer_id)
      : null,
    razorpayTokenId: rows[0].razorpay_token_id
      ? String(rows[0].razorpay_token_id)
      : null,
  };
}

export async function setSavedCardEnabled(args: {
  accountId: string;
  enabled: boolean;
}) {
  await exec(
    `INSERT INTO billing_customers (account_id, saved_card_enabled)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       saved_card_enabled = VALUES(saved_card_enabled),
       updated_at = NOW()`,
    [args.accountId, args.enabled ? 1 : 0],
  );
}

export async function createPayment(args: {
  id: string;
  accountId: string;
  ticketId: string | null;
  planCode?: string | null;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  currency: string;
  displayAmount?: number | null;
  displayCurrency?: string | null;
  provider: "razorpay";
  razorpayOrderId: string;
}) {
  await exec(
    `INSERT INTO payments
      (id, account_id, ticket_id, plan_code, type, status, amount, currency, display_amount, display_currency, provider, razorpay_order_id, created_at, updated_at)
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      args.id,
      args.accountId,
      args.ticketId,
      args.planCode ?? null,
      args.type,
      args.status,
      args.amount,
      args.currency,
      args.displayAmount ?? null,
      args.displayCurrency ?? null,
      args.provider,
      args.razorpayOrderId,
    ],
  );
}

export async function getLatestTicketPayment(ticketId: string) {
  const rows: any[] = await query(
    `SELECT *
       FROM payments
      WHERE ticket_id = ? AND type = 'incident'
      ORDER BY created_at DESC
      LIMIT 1`,
    [ticketId],
  );
  return rows[0] ? mapPayment(rows[0]) : null;
}

export async function getLatestSubscriptionPayment(accountId: string) {
  const rows: any[] = await query(
    `SELECT *
       FROM payments
      WHERE account_id = ? AND type = 'subscription'
      ORDER BY created_at DESC
      LIMIT 1`,
    [accountId],
  );
  return rows[0] ? mapPayment(rows[0]) : null;
}

export async function hasSucceededIncidentPayment(ticketId: string) {
  const rows: any[] = await query(
    `SELECT COUNT(*) AS c
       FROM payments
      WHERE ticket_id = ? AND type='incident' AND status='succeeded'
      LIMIT 1`,
    [ticketId],
  );
  return Number(rows?.[0]?.c ?? 0) > 0;
}

export async function markPaymentSucceeded(args: {
  paymentId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  razorpayEventId?: string | null;
}) {
  await exec(
    `UPDATE payments
        SET status='succeeded',
            razorpay_payment_id = ?,
            razorpay_signature = ?,
            razorpay_event_id = COALESCE(?, razorpay_event_id),
            updated_at = NOW()
      WHERE id = ?`,
    [
      args.razorpayPaymentId,
      args.razorpaySignature,
      args.razorpayEventId ?? null,
      args.paymentId,
    ],
  );
}

export async function markPaymentFailed(args: {
  paymentId: string;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  razorpayEventId?: string | null;
}) {
  await exec(
    `UPDATE payments
        SET status='failed',
            razorpay_payment_id = COALESCE(?, razorpay_payment_id),
            razorpay_signature = COALESCE(?, razorpay_signature),
            razorpay_event_id = COALESCE(?, razorpay_event_id),
            updated_at = NOW()
      WHERE id = ?`,
    [
      args.razorpayPaymentId ?? null,
      args.razorpaySignature ?? null,
      args.razorpayEventId ?? null,
      args.paymentId,
    ],
  );
}

export async function markPaymentSucceededByOrderId(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpayEventId?: string | null;
}) {
  await exec(
    `UPDATE payments
        SET status='succeeded',
            razorpay_payment_id = COALESCE(?, razorpay_payment_id),
            razorpay_event_id = COALESCE(?, razorpay_event_id),
            updated_at = NOW()
      WHERE razorpay_order_id = ?`,
    [
      args.razorpayPaymentId,
      args.razorpayEventId ?? null,
      args.razorpayOrderId,
    ],
  );
}

export async function markPaymentFailedByOrderId(args: {
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  razorpayEventId?: string | null;
}) {
  await exec(
    `UPDATE payments
        SET status='failed',
            razorpay_payment_id = COALESCE(?, razorpay_payment_id),
            razorpay_event_id = COALESCE(?, razorpay_event_id),
            updated_at = NOW()
      WHERE razorpay_order_id = ?`,
    [
      args.razorpayPaymentId ?? null,
      args.razorpayEventId ?? null,
      args.razorpayOrderId,
    ],
  );
}

export async function getPaymentById(paymentId: string) {
  const rows: any[] = await query(
    `SELECT * FROM payments WHERE id = ? LIMIT 1`,
    [paymentId],
  );
  return rows[0] ? mapPayment(rows[0]) : null;
}

export async function getPaymentByOrderId(razorpayOrderId: string) {
  const rows: any[] = await query(
    `SELECT * FROM payments WHERE razorpay_order_id = ? LIMIT 1`,
    [razorpayOrderId],
  );
  return rows[0] ? mapPayment(rows[0]) : null;
}

export async function insertWebhookEventOnce(args: {
  provider: string;
  eventId: string;
}) {
  const idRows: any[] = await query("SELECT UUID() AS id");
  const id = String(idRows?.[0]?.id ?? "");
  const packet: any = await exec(
    `INSERT IGNORE INTO billing_webhook_events (id, provider, event_id)
     VALUES (?, ?, ?)`,
    [id, args.provider, args.eventId],
  );
  return Number(packet?.affectedRows ?? 0) === 1;
}
