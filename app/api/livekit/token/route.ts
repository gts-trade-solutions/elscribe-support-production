import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import {
  getAgentTicket,
  getTicketAssignedAgent,
  getTicketForCustomer,
} from "@/lib/ticket-repo";
import { getActiveAcceptedCallForTicket } from "@/lib/call-request-repo";
import { ensureLiveKitRoomActive } from "@/lib/media-room-repo";
import {
  getLiveKitEnv,
  livekitRoomNameForTicket,
  mintLiveKitToken,
} from "@/lib/livekit/server";
import { ensureTicketUnlockedForAgentAction } from "@/lib/billing/gate";

const BodySchema = z.object({
  ticketId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", message: "ticketId is required" },
        { status: 400 },
      );
    }

    const ticketId = parsed.data.ticketId;

    // Authorization (same rules as chat)
    let agentAlias = "Customer";

    if (token.role === "customer") {
      const t = await getTicketForCustomer({ ticketId, token });
      if (!t) {
        return NextResponse.json(
          { error: "not_found", message: "Ticket not found" },
          { status: 404 },
        );
      }
      agentAlias =
        (t as any).agent_alias || (t as any).agentAlias || "Customer";
    } else if (token.role === "agent") {
      const t = await getAgentTicket(ticketId);
      if (!t) {
        return NextResponse.json(
          { error: "not_found", message: "Ticket not found" },
          { status: 404 },
        );
      }
      agentAlias =
        (t as any).agent_alias || (t as any).agentAlias || "Customer";

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
      agentAlias =
        (t as any).agent_alias || (t as any).agentAlias || "Customer";
    }

    const gate = await ensureTicketUnlockedForAgentAction(ticketId);
    if (!gate.ok) {
      if (gate.error === "INCIDENT_NOT_SELECTED") {
        return NextResponse.json(
          {
            error: "incident_not_selected",
            message: "Select an incident type before starting live support.",
          },
          { status: 409 },
        );
      }
      if (gate.error === "QUOTE_REQUIRED") {
        return NextResponse.json(
          {
            error: "quote_required",
            message:
              "An admin quote is still pending for this ticket. Live calls are unavailable until the quoted amount is issued and paid.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: "payment_required",
          message:
            "Payment required before starting voice/video. Please complete payment first.",
        },
        { status: 402 },
      );
    }

    // Only mint tokens when there is an active accepted call.
    const activeCall = await getActiveAcceptedCallForTicket(ticketId);
    if (!activeCall) {
      return NextResponse.json(
        {
          error: "no_active_call",
          message: "No accepted call for this ticket",
        },
        { status: 409 },
      );
    }

    // Ensure media room exists
    await ensureLiveKitRoomActive(ticketId);

    const roomName = livekitRoomNameForTicket(ticketId);
    const { url } = getLiveKitEnv();

    // Identity must not contain PII.
    const identity = `${token.role}_${token.uid}`;

    // Name shown to participants (agent must not see PII)
    const name =
      token.role === "customer"
        ? agentAlias // safe alias per ticket
        : token.role === "agent"
          ? "Agent"
          : "Admin";

    const jwt = await mintLiveKitToken({
      identity,
      name,
      roomName,
      grants: {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    });

    return NextResponse.json({
      ok: true,
      url,
      roomName,
      token: jwt,
      callRequest: activeCall,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", message: e?.message ?? "Unknown error" },
      { status: e?.message === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
