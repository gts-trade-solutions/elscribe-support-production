import crypto from "crypto";

const API_BASE = "https://api.razorpay.com/v1";

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
  notes?: Record<string, any>;
};

export type RazorpayPayment = {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: string; // created|authorized|captured|failed|refunded
  order_id?: string;
  method?: string;
  email?: string;
  contact?: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env: ${name}`);
  return String(v).trim();
}

export function getRazorpayKeyId() {
  return mustEnv("RAZORPAY_KEY_ID");
}

function getAuthHeader() {
  const keyId = mustEnv("RAZORPAY_KEY_ID");
  const keySecret = mustEnv("RAZORPAY_KEY_SECRET");
  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${token}`;
}

async function rpFetch<T>(
  path: string,
  init: RequestInit & { json?: any } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", getAuthHeader());
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: init.json ? JSON.stringify(init.json) : init.body,
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      data?.error?.description || data?.error?.code || data?.message || text;
    throw new Error(`Razorpay API error (${res.status}): ${msg}`);
  }

  return data as T;
}

export async function createRazorpayOrder(args: {
  amount: number; // smallest unit (paise)
  currency: string;
  receipt?: string;
  notes?: Record<string, any>;
}) {
  // Docs: Orders API requires amount in currency subunits.
  // https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
  return rpFetch<RazorpayOrder>("/orders", {
    method: "POST",
    json: {
      amount: args.amount,
      currency: args.currency,
      receipt: args.receipt,
      notes: args.notes,
    },
  });
}

export async function fetchRazorpayPayment(paymentId: string) {
  // Docs: Payments API can fetch by id.
  // https://razorpay.com/docs/api/understand/
  return rpFetch<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
}

export function verifyRazorpayCheckoutSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  // Docs: generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret)
  // https://razorpay.com/docs/payments/payment-gateway/quick-integration/integration-steps/
  const secret = mustEnv("RAZORPAY_KEY_SECRET");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(args.signature || ""), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyRazorpayWebhookSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
}) {
  const secret = mustEnv("RAZORPAY_WEBHOOK_SECRET");
  const received = String(args.signatureHeader || "").trim();
  if (!received) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    // IMPORTANT: must be raw body, not parsed JSON.
    .update(args.rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
