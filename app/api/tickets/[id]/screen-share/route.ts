import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import {
  getAgentTicket,
  getTicketAssignedAgent,
  getTicketForCustomer,
} from "@/lib/ticket-repo";
import { logScreenShareEvent } from "@/lib/screen-share-repo";
import { insertAuditLog } from "@/lib/audit-repo";

const TicketIdSchema = z.string().uuid();
const BodySchema = z.object({
  status: z.enum(["started", "stopped"]),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);
    const ticketIdParsed = TicketIdSchema.safeParse(ctx.params.id);
    if (!ticketIdParsed.success) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid ticket id" },
        { status: 400 },
      );
    }

    const ticketId = ticketIdParsed.data;
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", message: "status must be started|stopped" },
        { status: 400 },
      );
    }

    // Authorization
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

    const event = await logScreenShareEvent({
      ticketId,
      status: parsed.data.status,
    });

    await insertAuditLog({
      actor: token,
      action: `screen_share.${parsed.data.status}`,
      entityType: "ticket",
      entityId: ticketId,
      metadata: event,
    });

    return NextResponse.json({ ok: true, event });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", message: e?.message ?? "Unknown error" },
      { status: e?.message === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
