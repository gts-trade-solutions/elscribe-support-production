import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthToken } from "@/lib/auth/server";
import { getTicketForCustomer } from "@/lib/ticket-repo";
import {
  getPaymentById,
  markPaymentFailed,
  markPaymentSucceeded,
} from "@/lib/billing/billing-repo";
import {
  fetchRazorpayPayment,
  verifyRazorpayCheckoutSignature,
} from "@/lib/razorpay/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  ticketId: z.string().uuid(),
  paymentId: z.string().uuid(),
  razorpay_payment_id: z.string().min(3),
  razorpay_order_id: z.string().min(3),
  razorpay_signature: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "customer" && token.role !== "admin") {
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

    const {
      ticketId,
      paymentId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = parsed.data;

    // Authorization: customer must own ticket.
    if (token.role === "customer") {
      const t = await getTicketForCustomer({ ticketId, token });
      if (!t) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const p = await getPaymentById(paymentId);
    if (!p || p.ticketId !== ticketId) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Payment not found" },
        { status: 404 },
      );
    }

    if (token.accountId && p.accountId !== token.accountId) {
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
        {
          error: "bad_request",
          message: "Order mismatch",
        },
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

    // Verify payment status from API (captured is the successful final state).
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
            "Captured payment amount or currency does not match the ticket billing record.",
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

    await markPaymentSucceeded({
      paymentId,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    return NextResponse.json(
      { error: "server_error", message: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
