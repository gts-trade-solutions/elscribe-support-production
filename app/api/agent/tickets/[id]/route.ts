import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import { getAgentTicket, getTicketAssignedAgent } from "@/lib/ticket-repo";

const TicketIdSchema = z.string().uuid();

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
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

    const t = await getAgentTicket(ticketId);
    if (!t) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if (token.role === "agent") {
      const assigned = await getTicketAssignedAgent(ticketId);
      if (assigned && String(assigned) !== String(token.uid)) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    }

    return NextResponse.json({ ticket: t });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
