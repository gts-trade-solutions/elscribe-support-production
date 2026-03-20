import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import {
  getTicketAssignedAgent,
  getTicketForCustomer,
  getAgentTicket,
} from "@/lib/ticket-repo";
import { createAuditLog } from "@/lib/audit-repo";
import {
  createMessageForTicket,
  listTicketMessages,
} from "@/lib/messages-repo";

const PostSchema = z.object({
  body: z.string().min(1).max(5000),
});

function toDto(m: any) {
  return {
    id: m.id,
    ticket_id: m.ticketId,
    sender_role: m.senderRole,
    sender_user_id: m.senderUserId,
    body: m.body,
    created_at: m.createdAt,
    created_at_ms: m.createdAtMs,
  };
}

async function assertCanAccessTicket(token: any, ticketId: string) {
  if (token.role === "customer") {
    const ticket = await getTicketForCustomer({ ticketId, token });
    if (!ticket) return { ok: false, status: 404 };
    return { ok: true };
  }

  const ticket = await getAgentTicket(ticketId);
  if (!ticket) return { ok: false, status: 404 };

  if (token.role === "agent") {
    const assigned = await getTicketAssignedAgent(ticketId);
    if (assigned && String(assigned) !== String(token.uid)) {
      return { ok: false, status: 403 };
    }
  }

  return { ok: true };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await requireAuthToken(req);
    const ticketId = params.id; // UUID string

    const access = await assertCanAccessTicket(token, ticketId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 403 ? "forbidden" : "not_found" },
        { status: access.status },
      );
    }

    const messages = (await listTicketMessages(ticketId)).map(toDto);
    return NextResponse.json({ messages });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", message: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await requireAuthToken(req);
    const ticketId = params.id; // UUID string

    const bodyJson = await req.json();
    const parsed = PostSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const access = await assertCanAccessTicket(token, ticketId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 403 ? "forbidden" : "not_found" },
        { status: access.status },
      );
    }

    const msg = await createMessageForTicket({
      ticketId,
      senderRole: token.role,
      senderUserId: token.uid,
      body: parsed.data.body,
    });

    await createAuditLog({
      actorUserId: token.uid,
      actorRole: token.role,
      action: "ticket.message.create",
      entityType: "ticket",
      entityId: ticketId,
      metadata: { messageId: msg.id },
    });

    // If the client used REST fallback, still broadcast so the other side updates realtime.
    try {
      const io = (globalThis as any).__fixmate_io;
      if (io) {
        io.to(`ticket:${ticketId}`).emit("message:new", {
          message: toDto(msg),
        });
      }
    } catch {}

    return NextResponse.json({ message: toDto(msg) });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", message: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
