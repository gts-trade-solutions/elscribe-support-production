import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import { insertAuditLog } from "@/lib/audit-repo";
import { updateAdminManagedTicket } from "@/lib/admin-repo";

const BodySchema = z.object({
  status: z
    .enum(["open", "in_progress", "waiting_customer", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedAgentId: z.string().uuid().nullable().optional(),
  billingOverrideState: z.enum(["system", "cleared", "blocked"]).optional(),
  billingOverrideNote: z.string().max(1000).nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const ok = await updateAdminManagedTicket({
      ticketId: ctx.params.id,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignedAgentId: parsed.data.assignedAgentId,
      billingOverrideState: parsed.data.billingOverrideState,
      billingOverrideNote: parsed.data.billingOverrideNote,
      updatedByUserId: token.uid,
    });

    if (!ok) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await insertAuditLog({
      actor: token,
      action: "admin.ticket.managed",
      entityType: "ticket",
      entityId: ctx.params.id,
      metadata: parsed.data,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      {
        status:
          msg === "UNAUTHORIZED"
            ? 401
            : msg === "ASSIGNEE_NOT_FOUND"
              ? 400
              : 500,
      },
    );
  }
}
