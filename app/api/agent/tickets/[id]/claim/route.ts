import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import { claimTicket } from "@/lib/ticket-repo";
import { insertAuditLog } from "@/lib/audit-repo";
import { ensureTicketUnlockedForAgentAction } from "@/lib/billing/gate";

const TicketIdSchema = z.string().uuid();

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "agent" && token.role !== "admin") {
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

    const gate = await ensureTicketUnlockedForAgentAction(ticketId);
    if (!gate.ok) {
      if (gate.error === "NOT_FOUND") {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      if (gate.error === "QUOTE_REQUIRED") {
        return NextResponse.json(
          {
            error: "QUOTE_REQUIRED",
            message:
              "This ticket is waiting for an admin quote before it can be claimed.",
          },
          { status: 409 },
        );
      }
      if (gate.error === "INCIDENT_NOT_SELECTED") {
        return NextResponse.json(
          {
            error: "INCIDENT_NOT_SELECTED",
            message:
              "The customer must select an incident type before this ticket can be claimed.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: "PAYMENT_REQUIRED",
          message:
            "Customer must complete payment before you can claim this ticket.",
        },
        { status: 402 },
      );
    }

    const result = await claimTicket({ ticketId, agentId: token.uid });
    if (result === "not_found") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (result === "already_assigned") {
      return NextResponse.json({ error: "ALREADY_ASSIGNED" }, { status: 409 });
    }

    await insertAuditLog({
      actor: token,
      action: "ticket.claimed",
      entityType: "ticket",
      entityId: ticketId,
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
