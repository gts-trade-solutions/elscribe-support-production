import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import { insertAuditLog } from "@/lib/audit-repo";
import { getIncidentByCode } from "@/lib/billing/pricing";
import {
  getAgentTicket,
  getTicketAssignedAgent,
  getTicketForCustomer,
  updateTicketForAdmin,
  updateTicketForAgent,
  updateTicketForCustomer,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/ticket-repo";

const UpdateSchema = z.object({
  status: z
    .enum(["open", "in_progress", "waiting_customer", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.string().max(64).nullable().optional(),
  subject: z.string().min(3).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  incidentTypeSelected: z.string().max(64).nullable().optional(),
  resolutionIncidentType: z.string().max(64).nullable().optional(),
});

function normalizeIncident(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return value;
}

function isIncidentLocked(args: {
  existing: string | null | undefined;
  next: string | null | undefined;
}) {
  if (args.next === undefined) return false;
  const existing = args.existing ?? null;
  const next = args.next ?? null;
  return Boolean(existing && existing !== next);
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);
    if (
      token.role !== "customer" &&
      token.role !== "agent" &&
      token.role !== "admin"
    ) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (token.role === "customer") {
      const ticket = await getTicketForCustomer({
        ticketId: ctx.params.id,
        token,
      });
      if (!ticket) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ ticket });
    }

    const ticket = await getAgentTicket(ctx.params.id);
    if (!ticket) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (token.role === "agent") {
      const assigned = await getTicketAssignedAgent(ctx.params.id);
      if (assigned && String(assigned) !== String(token.uid)) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    }

    return NextResponse.json({ ticket });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);
    if (
      token.role !== "customer" &&
      token.role !== "agent" &&
      token.role !== "admin"
    ) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (
      parsed.data.incidentTypeSelected !== undefined &&
      parsed.data.incidentTypeSelected !== null &&
      parsed.data.incidentTypeSelected !== "" &&
      !getIncidentByCode(parsed.data.incidentTypeSelected)
    ) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid incidentTypeSelected" },
        { status: 400 },
      );
    }

    const normalizedIncidentTypeSelected = normalizeIncident(
      parsed.data.incidentTypeSelected,
    );

    if (token.role === "agent") {
      const assigned = await getTicketAssignedAgent(ctx.params.id);
      if (!assigned) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      if (String(assigned) !== String(token.uid)) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }

      if (
        parsed.data.category !== undefined ||
        parsed.data.subject !== undefined ||
        parsed.data.description !== undefined ||
        parsed.data.incidentTypeSelected !== undefined
      ) {
        return NextResponse.json(
          { error: "FORBIDDEN_FIELDS" },
          { status: 403 },
        );
      }

      const ok = await updateTicketForAgent({
        ticketId: ctx.params.id,
        agentId: token.uid,
        status: parsed.data.status as TicketStatus | undefined,
        priority: parsed.data.priority as TicketPriority | undefined,
        resolutionIncidentType: parsed.data.resolutionIncidentType,
      });

      if (!ok) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
    } else if (token.role === "admin") {
      const existing = await getAgentTicket(ctx.params.id);
      if (!existing) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }

      if (
        isIncidentLocked({
          existing: existing.incident_type_selected,
          next: normalizedIncidentTypeSelected,
        })
      ) {
        return NextResponse.json(
          {
            error: "INCIDENT_LOCKED",
            message:
              "Incident type is locked after it is selected the first time. Use the admin quote flow for pricing instead of changing the incident.",
          },
          { status: 409 },
        );
      }

      const ok = await updateTicketForAdmin({
        ticketId: ctx.params.id,
        status: parsed.data.status as TicketStatus | undefined,
        priority: parsed.data.priority as TicketPriority | undefined,
        category: parsed.data.category,
        subject: parsed.data.subject,
        description: parsed.data.description,
        incidentTypeSelected: normalizedIncidentTypeSelected,
        resolutionIncidentType: parsed.data.resolutionIncidentType,
      });

      if (!ok) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
    } else {
      const existing = await getTicketForCustomer({
        ticketId: ctx.params.id,
        token,
      });
      if (!existing) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }

      if (
        parsed.data.priority !== undefined ||
        parsed.data.resolutionIncidentType !== undefined
      ) {
        return NextResponse.json(
          { error: "FORBIDDEN_FIELDS" },
          { status: 403 },
        );
      }

      if (
        isIncidentLocked({
          existing: existing.incident_type_selected,
          next: normalizedIncidentTypeSelected,
        })
      ) {
        return NextResponse.json(
          {
            error: "INCIDENT_LOCKED",
            message:
              "Incident type is locked after it is selected the first time and cannot be changed later.",
          },
          { status: 409 },
        );
      }

      await updateTicketForCustomer({
        ticketId: ctx.params.id,
        token,
        status: parsed.data.status as TicketStatus | undefined,
        category: parsed.data.category,
        subject: parsed.data.subject,
        description: parsed.data.description,
        incidentTypeSelected: normalizedIncidentTypeSelected,
      });
    }

    await insertAuditLog({
      actor: token,
      action: "ticket.updated",
      entityType: "ticket",
      entityId: ctx.params.id,
      metadata: parsed.data,
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
