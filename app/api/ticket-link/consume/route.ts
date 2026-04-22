import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { query } from "@/lib/db";
import { recordVisit } from "@/lib/magic-link-repo";
import { validateMagicLinkCompound } from "@/lib/magic-link-validate";
import { getGuestUser } from "@/lib/auth/guest-user-repo";
import { getTicketBillingState } from "@/lib/billing/gate";
import {
  getDisplayCurrency,
  getIncidentByCode,
  type IncidentType,
} from "@/lib/billing/pricing";
import { createAuditLog } from "@/lib/audit-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  token: z.string().min(3).max(512),
});

const GUEST_SESSION_TTL_MS = 48 * 60 * 60 * 1000;

function errorPayload(code: string, message: string) {
  return { ok: false, code, message };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(errorPayload("invalid", "Malformed request."), {
      status: 400,
    });
  }

  const validation = await validateMagicLinkCompound(parsed.data.token);
  if (!validation.ok) {
    if (validation.code === "invalid") {
      return NextResponse.json(
        errorPayload("invalid", "This link is invalid."),
        { status: 400 },
      );
    }
    if (validation.code === "not_found") {
      return NextResponse.json(
        errorPayload("not_found", "This link is invalid."),
        { status: 404 },
      );
    }
    if (validation.code === "revoked") {
      return NextResponse.json(
        errorPayload(
          "revoked",
          "This link has been revoked by an administrator.",
        ),
        { status: 410 },
      );
    }
    // expired
    return NextResponse.json(
      errorPayload("expired", "This link has expired."),
      { status: 410 },
    );
  }

  const row = validation.row;

  // Defensive: confirm the bound user is still a guest. A guest user cannot
  // be demoted back to a "real" user in-place — our conversion flow (Phase 6)
  // will clear `is_guest` — so a row with `is_guest = 0` here means the
  // guest has completed conversion. In that case the link should not mint
  // a new guest session; the user should sign in normally.
  const guestUser = await getGuestUser(row.guestUserId);
  if (!guestUser) {
    // Either the user was hard-deleted or they're no longer a guest.
    return NextResponse.json(
      errorPayload(
        "already_converted",
        "This ticket has been claimed by a user account. Please sign in to continue.",
      ),
      { status: 409 },
    );
  }

  // Defense-in-depth on top of Phase 2's block: if a real (non-guest) user
  // with the same email exists, do not mint a guest session — route the
  // visitor to sign in instead. Phase 2's magic-link generation API already
  // refuses this case, but between generation and click an email might have
  // been registered normally.
  //
  // TODO(phase-4+): when we detect this branch, transfer the ticket to the
  // real user's account after they successfully sign in (guarded by email
  // match). Helper would live in lib/ticket-repo.ts — move the row's
  // account_id to the signed-in user's primary account and update
  // created_by_user_id. Skipping for Phase 3.
  const collision = await query<{ id: string; is_guest: number | boolean }>(
    `SELECT id, is_guest
       FROM users
       WHERE LOWER(email) = LOWER(?)
         AND id != ?
       LIMIT 1`,
    [guestUser.email, guestUser.id],
  );
  if (collision[0] && Number(collision[0].is_guest) !== 1) {
    return NextResponse.json({
      ok: false,
      code: "existing_real_user",
      message:
        "This ticket is linked to an existing account. Please sign in to continue.",
      email: guestUser.email,
      redirectTo: `/signin?callbackUrl=${encodeURIComponent(
        `/tickets/${row.ticketId}`,
      )}`,
    });
  }

  const billingState = await getTicketBillingState(row.ticketId);
  if (!billingState) {
    return NextResponse.json(
      errorPayload(
        "not_found",
        "The ticket this link refers to could not be found.",
      ),
      { status: 404 },
    );
  }

  const ticketRows = await query<{
    id: string;
    subject: string;
    description: string | null;
    category: string | null;
    incident_type_selected: string | null;
    resolution_incident_type: string | null;
    agent_alias: string;
  }>(
    `SELECT t.id,
            t.subject,
            t.description,
            t.category,
            t.incident_type_selected,
            t.resolution_incident_type,
            a.agent_alias
       FROM tickets t
       JOIN ticket_aliases a ON a.ticket_id = t.id
      WHERE t.id = ?
      LIMIT 1`,
    [row.ticketId],
  );
  const ticketRow = ticketRows[0];
  if (!ticketRow) {
    return NextResponse.json(
      errorPayload("not_found", "Ticket not found."),
      { status: 404 },
    );
  }

  const incident: IncidentType | null = getIncidentByCode(
    billingState.incidentTypeSelected,
  );
  const displayCurrency =
    billingState.quoteCurrency || getDisplayCurrency();
  const displayAmount =
    incident?.pricingModel === "quoted"
      ? billingState.quoteAmount
      : (incident?.amount ?? null);

  // Record the visit *before* we return so the agent/admin link list can
  // show "Visited N times". A single link may be re-consumed (refresh,
  // pay-later, etc.) — each call to consume counts as a visit.
  await recordVisit(row.id);

  await createAuditLog({
    actorUserId: row.guestUserId,
    actorRole: "customer",
    action: "ticket.magic_link.consumed",
    entityType: "ticket",
    entityId: row.ticketId,
    metadata: {
      linkId: row.id,
      ticketId: row.ticketId,
      guestUserId: row.guestUserId,
      visitCount: row.visitCount + 1,
    },
  });

  const sessionExpiresAt = new Date(
    Date.now() + GUEST_SESSION_TTL_MS,
  ).toISOString();

  return NextResponse.json({
    ok: true,
    ticket: {
      id: ticketRow.id,
      subject: ticketRow.subject,
      description: ticketRow.description,
      category: ticketRow.category,
      incidentTypeSelected: ticketRow.incident_type_selected,
      resolutionIncidentType: ticketRow.resolution_incident_type,
      agentAlias: ticketRow.agent_alias,
    },
    billing: {
      incidentLabel: incident?.label ?? null,
      publicPriceLabel: incident?.publicPriceLabel ?? null,
      pricingModel: incident?.pricingModel ?? null,
      displayAmount,
      displayCurrency,
      quoteAmount: billingState.quoteAmount,
      quoteCurrency: billingState.quoteCurrency,
      quoteNote: billingState.quoteNote,
      isPaid: billingState.isPaid,
      paymentRequired: billingState.paymentRequired,
      quoteRequired: billingState.quoteRequired,
      quoteAvailable: billingState.quoteAvailable,
      coveredByPlan: billingState.coveredByPlan,
      coveredPlanCode: billingState.coveredPlanCode,
      billingOverrideState: billingState.billingOverrideState,
      billingOverrideNote: billingState.billingOverrideNote,
    },
    session: {
      guestUserId: row.guestUserId,
      guestEmail: guestUser.email,
      sessionExpiresAt,
    },
    link: {
      linkId: row.id,
      linkExpiresAt: row.expiresAt,
    },
  });
}
