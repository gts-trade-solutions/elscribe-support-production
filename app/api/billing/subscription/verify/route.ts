import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthToken } from "@/lib/auth/server";
import { countOccupiedSeats } from "@/lib/account-repo";
import {
  fetchRazorpayPayment,
  verifyRazorpayCheckoutSignature,
} from "@/lib/razorpay/server";
import {
  getPaymentById,
  markPaymentFailed,
  markPaymentSucceeded,
} from "@/lib/billing/billing-repo";
import { getCompanyPlanByCode } from "@/lib/billing/pricing";
import {
  applyCompanyPlanEntitlement,
  getAccountSubscription,
} from "@/lib/billing/subscription-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  paymentId: z.string().uuid(),
  razorpay_payment_id: z.string().min(3),
  razorpay_order_id: z.string().min(3),
  razorpay_signature: z.string().min(8),
});

function addDays(date: Date, days: number) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function resolvePlanPeriod(
  existing: Awaited<ReturnType<typeof getAccountSubscription>>,
  planCode: string,
) {
  const now = new Date();
  if (
    existing &&
    existing.status === "active" &&
    existing.planCode === planCode &&
    existing.currentPeriodEnd &&
    new Date(existing.currentPeriodEnd).getTime() > now.getTime()
  ) {
    return {
      currentPeriodStart: existing.currentPeriodStart
        ? new Date(existing.currentPeriodStart)
        : now,
      currentPeriodEnd: addDays(new Date(existing.currentPeriodEnd), 30),
    };
  }
  return {
    currentPeriodStart: now,
    currentPeriodEnd: addDays(now, 30),
  };
}

export async function POST(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "customer" && token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (!token.accountId && token.role !== "admin") {
      return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 400 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      paymentId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = parsed.data;

    const p = await getPaymentById(paymentId);
    if (!p || p.type !== "subscription") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Subscription payment not found" },
        { status: 404 },
      );
    }

    if (
      token.role !== "admin" &&
      token.accountId &&
      p.accountId !== token.accountId
    ) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const orderIdFromDb = p.razorpayOrderId;
    if (!orderIdFromDb || orderIdFromDb !== razorpay_order_id) {
      await markPaymentFailed({
        paymentId,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });
      return NextResponse.json(
        { error: "bad_request", message: "Order mismatch" },
        { status: 400 },
      );
    }

    const okSig = verifyRazorpayCheckoutSignature({
      orderId: orderIdFromDb,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!okSig) {
      await markPaymentFailed({
        paymentId,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });
      return NextResponse.json(
        { error: "bad_request", message: "Invalid signature" },
        { status: 400 },
      );
    }

    const rp = await fetchRazorpayPayment(razorpay_payment_id);
    const status = String(rp?.status || "").toLowerCase();
    const captured = status === "captured";

    if (
      Number(rp?.amount ?? 0) !== Number(p.amount) ||
      String(rp?.currency || "") !== String(p.currency)
    ) {
      await markPaymentFailed({
        paymentId,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });
      return NextResponse.json(
        {
          error: "payment_amount_mismatch",
          message:
            "Captured payment amount or currency does not match the subscription billing record.",
        },
        { status: 409 },
      );
    }

    if (!captured) {
      await markPaymentFailed({
        paymentId,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });
      return NextResponse.json(
        {
          error: "payment_not_captured",
          message: `Payment status is '${status}'.`,
        },
        { status: 409 },
      );
    }

    const plan = getCompanyPlanByCode(p.planCode);
    if (!plan) {
      return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
    }

    const occupiedSeats = await countOccupiedSeats(p.accountId);
    if (occupiedSeats > plan.seatLimit) {
      return NextResponse.json(
        {
          error: "PLAN_TOO_SMALL",
          message: `This workspace already uses ${occupiedSeats} seats, which exceeds ${plan.name}.`,
        },
        { status: 409 },
      );
    }

    const existingBeforeWrite = await getAccountSubscription(p.accountId);
    const alreadyApplied =
      p.status === "succeeded" &&
      existingBeforeWrite?.status === "active" &&
      existingBeforeWrite?.planCode === plan.code &&
      (existingBeforeWrite?.metadataJson as any)?.activatedByPaymentId ===
        paymentId;

    if (alreadyApplied) {
      return NextResponse.json({
        ok: true,
        alreadyVerified: true,
        plan,
        period: {
          currentPeriodStart: existingBeforeWrite.currentPeriodStart,
          currentPeriodEnd: existingBeforeWrite.currentPeriodEnd,
        },
      });
    }

    await markPaymentSucceeded({
      paymentId,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    const existing = await getAccountSubscription(p.accountId);
    const period = resolvePlanPeriod(existing, plan.code);

    await applyCompanyPlanEntitlement({
      accountId: p.accountId,
      planCode: plan.code,
      provider: "razorpay",
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      metadataJson: {
        activatedByPaymentId: paymentId,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    return NextResponse.json({ ok: true, plan, period });
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    return NextResponse.json(
      { error: "server_error", message: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
