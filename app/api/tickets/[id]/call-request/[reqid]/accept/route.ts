import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import { getAgentTicket, getTicketAssignedAgent } from "@/lib/ticket-repo";
import { insertAuditLog } from "@/lib/audit-repo";
import { acceptCallRequest } from "@/lib/call-request-repo";
import { ensureTicketUnlockedForAgentAction } from "@/lib/billing/gate";
import { emitCallRequestUpdate } from "@/lib/realtime";

const TicketIdSchema = z.string().uuid();
const RequestIdSchema = z.string().uuid();

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string; reqid: string } },
) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "agent" && token.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Only agents can accept calls." },
        { status: 403 },
      );
    }

    const ticketIdParsed = TicketIdSchema.safeParse(ctx.params.id);
    if (!ticketIdParsed.success) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid ticket id" },
        { status: 400 },
      );
    }

    const reqIdParsed = RequestIdSchema.safeParse(ctx.params.reqid);
    if (!reqIdParsed.success) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid request id" },
        { status: 400 },
      );
    }

    const ticketId = ticketIdParsed.data;
    const requestId = reqIdParsed.data;

    const t = await getAgentTicket(ticketId);
    if (!t) {
      return NextResponse.json(
        { error: "not_found", message: "Ticket not found" },
        { status: 404 },
      );
    }

    if (token.role === "agent") {
      const assigned = await getTicketAssignedAgent(ticketId);
      if (assigned && String(assigned) !== String(token.uid)) {
        return NextResponse.json(
          { error: "forbidden", message: "Ticket assigned to other agent" },
          { status: 403 },
        );
      }
    }

    const gate = await ensureTicketUnlockedForAgentAction(ticketId);
    if (!gate.ok && gate.error === "PAYMENT_REQUIRED") {
      return NextResponse.json(
        {
          error: "PAYMENT_REQUIRED",
          message:
            "Payment is required before accepting voice or video support. Ask the customer to pay first.",
        },
        { status: 402 },
      );
    }

    const row = await acceptCallRequest({
      requestId,
      ticketId,
      acceptedByUserId: token.uid,
    });

    await insertAuditLog({
      actor: token,
      action: "call_request.accepted",
      entityType: "ticket",
      entityId: ticketId,
      metadata: { requestId },
    });

    emitCallRequestUpdate(ticketId, row);

    return NextResponse.json({ ok: true, callRequest: row });
  } catch (err: any) {
    const msg = err?.message || "Unknown error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(
      { error: "server_error", message: msg },
      { status },
    );
  }
}
