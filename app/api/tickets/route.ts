import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import { createTicket, listTicketsForCustomer } from "@/lib/ticket-repo";
import { insertAuditLog } from "@/lib/audit-repo";
import { getIncidentByCode } from "@/lib/billing/pricing";
import { syncAccountSubscriptionEntitlement } from "@/lib/billing/subscription-repo";

const CreateSchema = z.object({
  subject: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10000).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  incidentTypeSelected: z.string().trim().max(120).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "customer") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const tickets = await listTicketsForCustomer(token);
    return NextResponse.json({ tickets });
  } catch (e: any) {
    const msg = String(e?.message || "ERROR");
    if (msg.startsWith("FAIR_USAGE_LIMIT_REACHED:")) {
      const [, limit, planCode] = msg.split(":");
      return NextResponse.json(
        {
          error: "FAIR_USAGE_LIMIT_REACHED",
          message: `This paid company plan has reached its fair usage limit of ${limit} tickets for the current billing period. Upgrade the plan band or wait until the next billing cycle to create more tickets.`,
          limit: Number(limit),
          planCode: planCode || null,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: msg || "ERROR" },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "customer" || !token.accountId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const incidentTypeSelected =
      parsed.data.incidentTypeSelected == null ||
      parsed.data.incidentTypeSelected === ""
        ? null
        : parsed.data.incidentTypeSelected;

    if (incidentTypeSelected && !getIncidentByCode(incidentTypeSelected)) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid incidentTypeSelected" },
        { status: 400 },
      );
    }

    await syncAccountSubscriptionEntitlement(token.accountId);

    const { ticketId, alias } = await createTicket({
      accountId: token.accountId,
      createdByUserId: token.uid,
      subject: parsed.data.subject,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      incidentTypeSelected,
    });

    await insertAuditLog({
      actor: token,
      action: "ticket.created",
      entityType: "ticket",
      entityId: ticketId,
      metadata: { alias, priority: "medium" },
    });

    return NextResponse.json({ ok: true, ticketId, alias }, { status: 201 });
  } catch (e: any) {
    const msg = String(e?.message || "ERROR");
    if (msg.startsWith("FAIR_USAGE_LIMIT_REACHED:")) {
      const [, limit, planCode] = msg.split(":");
      return NextResponse.json(
        {
          error: "FAIR_USAGE_LIMIT_REACHED",
          message: `This paid company plan has reached its fair usage limit of ${limit} tickets for the current billing period. Upgrade the plan band or wait until the next billing cycle to create more tickets.`,
          limit: Number(limit),
          planCode: planCode || null,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: msg || "ERROR" },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
