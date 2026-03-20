import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthToken } from "@/lib/auth/server";
import {
  getAgentTicket,
  getTicketAssignedAgent,
  getTicketForCustomer,
} from "@/lib/ticket-repo";
import { getTicketBillingState } from "@/lib/billing/gate";
import {
  getDisplayCurrency,
  getIncidentCatalog,
  getProcessorCurrency,
} from "@/lib/billing/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TicketIdSchema = z.string().uuid();

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);

    const parsedId = TicketIdSchema.safeParse(ctx.params.id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid ticket id" },
        { status: 400 },
      );
    }

    const ticketId = parsedId.data;

    if (token.role === "customer") {
      const t = await getTicketForCustomer({ ticketId, token });
      if (!t) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
    } else if (token.role === "agent") {
      const t = await getAgentTicket(ticketId);
      if (!t) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      const assigned = await getTicketAssignedAgent(ticketId);
      if (assigned && String(assigned) !== String(token.uid)) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Ticket assigned to other agent" },
          { status: 403 },
        );
      }
    } else {
      const t = await getAgentTicket(ticketId);
      if (!t) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
    }

    const base = await getTicketBillingState(ticketId);
    if (!base) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      currency: getDisplayCurrency(),
      displayCurrency: getDisplayCurrency(),
      processorCurrency: getProcessorCurrency(),
      incidentCatalog: getIncidentCatalog(),
      state: {
        isPaid: base.isPaid,
        latestPaymentStatus: base.latestPaymentStatus,
        incidentTypeSelected: base.incidentTypeSelected,
        resolutionIncidentType: base.resolutionIncidentType,
        paymentRequired: base.paymentRequired,
        quoteRequired: base.quoteRequired,
        quoteAvailable: base.quoteAvailable,
        quoteAmount: base.quoteAmount,
        quoteCurrency: base.quoteCurrency,
        quoteNote: base.quoteNote,
        quoteUpdatedAt: base.quoteUpdatedAt,
        coveredByPlan: base.coveredByPlan,
        coveredPlanCode: base.coveredPlanCode,
        billingOverrideState: base.billingOverrideState,
        billingOverrideNote: base.billingOverrideNote,
        unlockedForCalls: base.unlockedForCalls,
      },
    });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
