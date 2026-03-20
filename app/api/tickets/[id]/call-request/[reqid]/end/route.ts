import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import {
  getAgentTicket,
  getTicketAssignedAgent,
  getTicketForCustomer,
} from "@/lib/ticket-repo";
import { endCallRequest } from "@/lib/call-request-repo";
import { insertAuditLog } from "@/lib/audit-repo";
import { emitCallRequestUpdate } from "@/lib/realtime";

const TicketIdSchema = z.string().uuid();
const RequestIdSchema = z.string().uuid();

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string; reqid: string } },
) {
  try {
    const token = await requireAuthToken(req);

    const ticketIdParsed = TicketIdSchema.safeParse(ctx.params.id);
    const reqIdParsed = RequestIdSchema.safeParse(ctx.params.reqid);
    if (!ticketIdParsed.success || !reqIdParsed.success) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid ticket or request id" },
        { status: 400 },
      );
    }

    const ticketId = ticketIdParsed.data;
    const requestId = reqIdParsed.data;

    // Authorization: same rules as chat
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

    const row = await endCallRequest({ ticketId, requestId });

    await insertAuditLog({
      actor: token,
      action: "call_request.ended",
      entityType: "ticket",
      entityId: ticketId,
      metadata: { requestId },
    });

    // Realtime update (so both sides close the call instantly)
    emitCallRequestUpdate(ticketId, row);

    return NextResponse.json({ ok: true, callRequest: row });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", message: e?.message ?? "Unknown error" },
      { status: e?.message === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
