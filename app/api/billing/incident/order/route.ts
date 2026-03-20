import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

import { requireAuthToken } from "@/lib/auth/server";
import { getTicketForCustomer } from "@/lib/ticket-repo";
import {
  getLatestTicketPayment,
  createPayment,
} from "@/lib/billing/billing-repo";
import {
  getDisplayCurrency,
  getIncidentByCode,
  getProcessorAmountFromDisplayAmount,
  getProcessorCurrency,
} from "@/lib/billing/pricing";
import { getTicketQuote } from "@/lib/billing/quote-repo";
import { getTicketBillingState } from "@/lib/billing/gate";
import { createRazorpayOrder, getRazorpayKeyId } from "@/lib/razorpay/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  ticketId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "customer") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { ticketId } = parsed.data;
    const ticket = await getTicketForCustomer({ ticketId, token });
    if (!ticket) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const incident = getIncidentByCode(ticket.incident_type_selected);
    if (!incident) {
      return NextResponse.json(
        {
          error: "INCIDENT_NOT_SELECTED",
          message: "Select an incident type before starting payment.",
        },
        { status: 409 },
      );
    }

    if (!token.accountId) {
      return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 400 });
    }

    const billingState = await getTicketBillingState(ticketId);
    if (billingState?.billingOverrideState === "cleared") {
      return NextResponse.json(
        {
          error: "BILLING_CLEARED",
          message:
            "This ticket billing was cleared by an admin. No per-incident payment is required.",
        },
        { status: 409 },
      );
    }

    if (billingState?.billingOverrideState === "blocked") {
      return NextResponse.json(
        {
          error: "BILLING_BLOCKED",
          message:
            "This ticket billing is currently blocked by an admin review and cannot be paid online yet.",
        },
        { status: 409 },
      );
    }

    if (billingState?.coveredByPlan) {
      return NextResponse.json(
        {
          error: "PLAN_INCLUDED",
          message:
            "This ticket is covered by the active company plan. No per-incident payment is required.",
          planCode: billingState.coveredPlanCode,
        },
        { status: 409 },
      );
    }

    const latest = await getLatestTicketPayment(ticketId);
    if (latest?.status === "succeeded") {
      return NextResponse.json(
        {
          error: "ALREADY_PAID",
          message: "This ticket already has a successful incident payment.",
        },
        { status: 409 },
      );
    }

    let displayAmount = incident.amount;
    let quote = null;
    if (incident.pricingModel === "quoted" || incident.amount == null) {
      quote = await getTicketQuote(ticketId);
      if (!quote) {
        return NextResponse.json(
          {
            error: "QUOTE_REQUIRED",
            message:
              "This incident is waiting for an admin quote before online payment becomes available.",
          },
          { status: 409 },
        );
      }
      displayAmount = quote.amount;
    }

    if (!displayAmount || displayAmount <= 0) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message:
            "Unable to determine a valid payable amount for this ticket.",
        },
        { status: 400 },
      );
    }

    const displayCurrency = quote?.currency || getDisplayCurrency();
    const processorCurrency = getProcessorCurrency();
    const processorAmount = getProcessorAmountFromDisplayAmount(displayAmount);
    const paymentId = randomUUID();

    const order = await createRazorpayOrder({
      amount: processorAmount,
      currency: processorCurrency,
      receipt: paymentId,
      notes: {
        ticketId,
        accountId: token.accountId,
        type: "incident",
        incidentType: incident.code,
        quoted: quote ? "yes" : "no",
        displayCurrency,
        displayAmount: String(displayAmount),
        processorCurrency,
      },
    });

    await createPayment({
      id: paymentId,
      accountId: token.accountId,
      ticketId,
      type: "incident",
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
      amount: processorAmount,
      currency: processorCurrency,
      displayAmount,
      displayCurrency,
      processorCurrency,
      keyId: getRazorpayKeyId(),
      incident,
      quote,
    });
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    return NextResponse.json(
      { error: "server_error", message: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
