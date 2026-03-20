import { NextResponse, type NextRequest } from "next/server";

import {
  getPaymentByOrderId,
  insertWebhookEventOnce,
  markPaymentFailedByOrderId,
  markPaymentSucceededByOrderId,
} from "@/lib/billing/billing-repo";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay/server";
import { getCompanyPlanByCode } from "@/lib/billing/pricing";
import { countOccupiedSeats } from "@/lib/account-repo";
import {
  applyCompanyPlanEntitlement,
  getAccountSubscription,
} from "@/lib/billing/subscription-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function addDays(date: Date, days: number) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function activateSubscriptionForPayment(
  orderId: string,
  paymentId: string,
) {
  const payment = await getPaymentByOrderId(orderId);
  if (!payment || payment.type !== "subscription" || !payment.planCode) return;

  const plan = getCompanyPlanByCode(payment.planCode);
  if (!plan) return;

  const occupiedSeats = await countOccupiedSeats(payment.accountId);
  if (occupiedSeats > plan.seatLimit) return;

  const existing = await getAccountSubscription(payment.accountId);
  const now = new Date();
  const period =
    existing &&
    existing.status === "active" &&
    existing.planCode === plan.code &&
    existing.currentPeriodEnd &&
    new Date(existing.currentPeriodEnd).getTime() > now.getTime()
      ? {
          currentPeriodStart: existing.currentPeriodStart
            ? new Date(existing.currentPeriodStart)
            : now,
          currentPeriodEnd: addDays(new Date(existing.currentPeriodEnd), 30),
        }
      : {
          currentPeriodStart: now,
          currentPeriodEnd: addDays(now, 30),
        };

  await applyCompanyPlanEntitlement({
    accountId: payment.accountId,
    planCode: plan.code,
    provider: "razorpay",
    currentPeriodStart: period.currentPeriodStart,
    currentPeriodEnd: period.currentPeriodEnd,
    metadataJson: {
      activatedByWebhook: true,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const eventId = req.headers.get("x-razorpay-event-id");

    const ok = verifyRazorpayWebhookSignature({
      rawBody,
      signatureHeader: signature,
    });
    if (!ok) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    if (eventId) {
      const inserted = await insertWebhookEventOnce({
        provider: "razorpay",
        eventId,
      });
      if (!inserted) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    let payload: any = null;
    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      payload = null;
    }

    const event = String(payload?.event || "");
    const pEntity = payload?.payload?.payment?.entity;
    const oEntity = payload?.payload?.order?.entity;

    const orderId = String(pEntity?.order_id || oEntity?.id || "").trim();
    const paymentId = String(pEntity?.id || "").trim();

    if (orderId) {
      if (event === "payment.captured" || event === "order.paid") {
        await markPaymentSucceededByOrderId({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpayEventId: eventId,
        });
        await activateSubscriptionForPayment(orderId, paymentId);
      }

      if (event === "payment.failed") {
        await markPaymentFailedByOrderId({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpayEventId: eventId,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", message: e?.message || "Unknown" },
      { status: 500 },
    );
  }
}
