import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

import { requireAuthToken } from "@/lib/auth/server";
import { countOccupiedSeats, getAccountSummary } from "@/lib/account-repo";
import {
  getCompanyPlanByCode,
  getDisplayCurrency,
  getProcessorAmountFromDisplayAmount,
  getProcessorCurrency,
} from "@/lib/billing/pricing";
import { createRazorpayOrder, getRazorpayKeyId } from "@/lib/razorpay/server";
import { createPayment } from "@/lib/billing/billing-repo";
import { syncAccountSubscriptionEntitlement } from "@/lib/billing/subscription-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  planCode: z.string().min(3),
});

export async function POST(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "customer") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (!token.accountId) {
      return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 400 });
    }
    if (token.accountType !== "company" || token.membershipRole !== "owner") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await syncAccountSubscriptionEntitlement(token.accountId);

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const plan = getCompanyPlanByCode(parsed.data.planCode);
    if (!plan) {
      return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
    }

    const account = await getAccountSummary(token.accountId);
    if (!account) {
      return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });
    }
    if (account.type !== "company") {
      return NextResponse.json(
        { error: "NOT_COMPANY_ACCOUNT" },
        { status: 400 },
      );
    }

    const occupiedSeats = await countOccupiedSeats(token.accountId);
    if (occupiedSeats > plan.seatLimit) {
      return NextResponse.json(
        {
          error: "PLAN_TOO_SMALL",
          message: `This workspace is already using ${occupiedSeats} seats. ${plan.name} supports up to ${plan.seatLimit} total seats.`,
        },
        { status: 409 },
      );
    }

    const displayAmount = plan.priceMonthlyUsd;
    const displayCurrency = getDisplayCurrency();
    const processorCurrency = getProcessorCurrency();
    const processorAmount = getProcessorAmountFromDisplayAmount(displayAmount);
    const paymentId = randomUUID();

    const order = await createRazorpayOrder({
      amount: processorAmount,
      currency: processorCurrency,
      receipt: paymentId,
      notes: {
        accountId: token.accountId,
        type: "subscription",
        planCode: plan.code,
        displayCurrency,
        displayAmount: String(displayAmount),
        processorCurrency,
      },
    });

    await createPayment({
      id: paymentId,
      accountId: token.accountId,
      ticketId: null,
      planCode: plan.code,
      type: "subscription",
      status: "pending",
      amount: processorAmount,
      currency: processorCurrency,
      displayAmount,
      displayCurrency,
      provider: "razorpay",
      razorpayOrderId: order.id,
    });

    return NextResponse.json({
      ok: true,
      paymentId,
      orderId: order.id,
      plan,
      amount: processorAmount,
      currency: processorCurrency,
      displayAmount,
      displayCurrency,
      processorCurrency,
      keyId: getRazorpayKeyId(),
    });
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    return NextResponse.json(
      { error: "server_error", message: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
