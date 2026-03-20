import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import {
  getAgentTicket,
  getTicketAssignedAgent,
  getTicketForCustomer,
} from "@/lib/ticket-repo";
import {
  createCallRequest,
  getLatestCallRequestForTicket,
} from "@/lib/call-request-repo";
import { ensureTicketUnlockedForAgentAction } from "@/lib/billing/gate";
import { emitCallRequestUpdate } from "@/lib/realtime";

const TicketIdSchema = z.string().uuid();
const BodySchema = z.object({
  type: z.enum(["voice", "video"]),
});

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);
    const ticketIdRaw = ctx.params.id;

    const parsedId = TicketIdSchema.safeParse(ticketIdRaw);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid ticketId" },
        { status: 400 },
      );
    }
    const ticketId = parsedId.data;

    if (token.role === "customer") {
      const t = await getTicketForCustomer({ ticketId, token });
      if (!t) {
        return NextResponse.json(
          { error: "not_found", message: "Ticket not found" },
          { status: 404 },
        );
      }
    } else if (token.role === "agent") {
      const t = await getAgentTicket(ticketId);
      if (!t) {
        return NextResponse.json(
          { error: "not_found", message: "Ticket not found" },
          { status: 404 },
        );
      }

      const assigned = await getTicketAssignedAgent(ticketId);
      if (assigned && String(assigned) !== String(token.uid)) {
        return NextResponse.json(
          { error: "forbidden", message: "Ticket assigned to other agent" },
          { status: 403 },
        );
      }
    } else {
      const t = await getAgentTicket(ticketId);
      if (!t) {
        return NextResponse.json(
          { error: "not_found", message: "Ticket not found" },
          { status: 404 },
        );
      }
    }

    const latest = await getLatestCallRequestForTicket(ticketId);
    return NextResponse.json({ ok: true, callRequest: latest ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", message: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);
    const ticketIdRaw = ctx.params.id;

    const parsedId = TicketIdSchema.safeParse(ticketIdRaw);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid ticketId" },
        { status: 400 },
      );
    }
    const ticketId = parsedId.data;

    if (token.role !== "customer") {
      return NextResponse.json(
        { error: "forbidden", message: "Only customers can request calls" },
        { status: 403 },
      );
    }

    const t = await getTicketForCustomer({ ticketId, token });
    if (!t) {
      return NextResponse.json(
        { error: "not_found", message: "Ticket not found" },
        { status: 404 },
      );
    }

    const assignedAgentId = await getTicketAssignedAgent(ticketId);
    if (!assignedAgentId) {
      return NextResponse.json(
        {
          error: "AGENT_NOT_ASSIGNED",
          message:
            "An agent must be assigned before voice or video support can be requested.",
        },
        { status: 409 },
      );
    }

    const gate = await ensureTicketUnlockedForAgentAction(ticketId);
    if (!gate.ok) {
      if (gate.error === "INCIDENT_NOT_SELECTED") {
        return NextResponse.json(
          {
            error: "INCIDENT_NOT_SELECTED",
            message:
              "Select an incident type before requesting voice or video support.",
          },
          { status: 409 },
        );
      }
      if (gate.error === "QUOTE_REQUIRED") {
        return NextResponse.json(
          {
            error: "QUOTE_REQUIRED",
            message:
              "This ticket is waiting for an admin quote before voice or video support can be requested.",
          },
          { status: 409 },
        );
      }
      if (gate.error === "PAYMENT_REQUIRED") {
        return NextResponse.json(
          {
            error: "PAYMENT_REQUIRED",
            message:
              "Payment is required before requesting voice or video support. Please pay first.",
          },
          { status: 402 },
        );
      }
    }

    const json = await req.json().catch(() => ({}));
    const parsedBody = BodySchema.safeParse(json);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "bad_request", message: "type must be 'voice' or 'video'" },
        { status: 400 },
      );
    }

    const created = await createCallRequest({
      ticketId,
      type: parsedBody.data.type,
      requestedBy: "customer",
      requestedByUserId: token.uid,
    });

    emitCallRequestUpdate(ticketId, created);

    return NextResponse.json({ ok: true, callRequest: created });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", message: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
