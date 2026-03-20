import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthToken } from "@/lib/auth/server";
import { insertAuditLog } from "@/lib/audit-repo";
import { getBillingCurrency, getIncidentByCode } from "@/lib/billing/pricing";
import { getTicketQuote, upsertTicketQuote } from "@/lib/billing/quote-repo";
import { getTicketBillingState } from "@/lib/billing/gate";
import {
  getAgentTicket,
  getTicketAssignedAgent,
  getTicketForCustomer,
} from "@/lib/ticket-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TicketIdSchema = z.string().uuid();
const BodySchema = z.object({
  amount: z.coerce.number().finite().positive().max(10000000),
  note: z.string().max(2000).optional().nullable(),
});

async function canReadTicket(req: NextRequest, ticketId: string) {
  const token = await requireAuthToken(req);

  if (token.role === "customer") {
    const t = await getTicketForCustomer({ ticketId, token });
    return { token, ticket: t };
  }

  const t = await getAgentTicket(ticketId);
  if (!t) return { token, ticket: null as any };

  if (token.role === "agent") {
    const assigned = await getTicketAssignedAgent(ticketId);
    if (assigned && String(assigned) !== String(token.uid)) {
      return { token, ticket: null as any };
    }
  }

  return { token, ticket: t };
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const parsedId = TicketIdSchema.safeParse(ctx.params.id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid ticket id" },
        { status: 400 },
      );
    }

    const { ticket } = await canReadTicket(req, parsedId.data);
    if (!ticket) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const quote = await getTicketQuote(parsedId.data);
    return NextResponse.json({ ok: true, quote });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const parsedId = TicketIdSchema.safeParse(ctx.params.id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid ticket id" },
        { status: 400 },
      );
    }

    const ticketId = parsedId.data;
    const ticket = await getAgentTicket(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const incident = getIncidentByCode(ticket.incident_type_selected);
    if (!incident || incident.pricingModel !== "quoted") {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "Quotes can only be issued for quoted incidents.",
        },
        { status: 409 },
      );
    }

    const billing = await getTicketBillingState(ticketId);
    if (billing?.billingOverrideState === "cleared") {
      return NextResponse.json(
        {
          error: "BILLING_CLEARED",
          message:
            "This ticket billing was cleared by an admin. Quote issuance is not required.",
        },
        { status: 409 },
      );
    }

    if (billing?.coveredByPlan) {
      return NextResponse.json(
        {
          error: "PLAN_INCLUDED",
          message:
            "This ticket is covered by the active company plan. Admin quote issuance is not required.",
        },
        { status: 409 },
      );
    }

    if (billing?.isPaid) {
      return NextResponse.json(
        {
          error: "ALREADY_PAID",
          message: "This ticket already has a successful payment.",
        },
        { status: 409 },
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const amount = Math.round(Number(parsed.data.amount) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "VALIDATION",
          message: "Quote amount must be greater than zero.",
        },
        { status: 400 },
      );
    }

    const quote = await upsertTicketQuote({
      ticketId,
      quotedByUserId: token.uid,
      amount,
      currency: getBillingCurrency(),
      note: parsed.data.note ?? null,
    });

    await insertAuditLog({
      actor: token,
      action: "ticket.quote.upserted",
      entityType: "ticket",
      entityId: ticketId,
      metadata: {
        quoteAmount: amount,
        currency: getBillingCurrency(),
        note: parsed.data.note ?? null,
      },
    });

    return NextResponse.json({ ok: true, quote });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
