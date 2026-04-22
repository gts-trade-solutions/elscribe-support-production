import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthToken } from "@/lib/auth/server";
import { exec } from "@/lib/db";
import { createTicket } from "@/lib/ticket-repo";
import { insertAuditLog } from "@/lib/audit-repo";
import { getBillingCurrency, getIncidentByCode } from "@/lib/billing/pricing";
import { upsertTicketQuote } from "@/lib/billing/quote-repo";
import {
  createGuestUser,
  findExistingUserByEmail,
} from "@/lib/auth/guest-user-repo";
import { getPrimaryAccountContextForUser } from "@/lib/auth/user-repo";
import {
  createMagicLink,
  findActiveByTicketId,
  revokeLink,
} from "@/lib/magic-link-repo";
import {
  generateRawToken,
  hashToken,
  packLinkToken,
} from "@/lib/magic-link-token";
import { getServerAppBaseUrl } from "@/lib/app-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAGIC_LINK_TTL_MS = 48 * 60 * 60 * 1000;

// TODO(rate-limit): add a per-agent rate limit (e.g. 20/hr) before production.
// Enforcement belongs here — either in a Redis-backed sliding window or the
// existing bullmq-adjacent infra. Out of scope for Phase 2.

const BodySchema = z.object({
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(255),
  incidentTypeSelected: z.string().trim().min(1).max(120),
  description: z.string().trim().max(5000).optional().nullable(),
  // Cents. Validated conditionally on pricingModel below.
  quoteAmount: z.coerce.number().int().positive().max(100_000_000).optional(),
  quoteCurrency: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .toUpperCase()
    .optional(),
  quoteNote: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "agent" && token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const incident = getIncidentByCode(parsed.data.incidentTypeSelected);
    if (!incident) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid incidentTypeSelected" },
        { status: 400 },
      );
    }

    if (incident.pricingModel === "quoted" && !parsed.data.quoteAmount) {
      return NextResponse.json(
        {
          error: "QUOTE_REQUIRED",
          message:
            "A quote amount is required for this incident before a link can be generated.",
        },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase().trim();

    // 1) Resolve or create the target user.
    const existing = await findExistingUserByEmail(email);
    if (existing && !existing.isGuest) {
      return NextResponse.json({
        status: "existing_real_user",
        email,
      });
    }

    let guestUserId: string;
    let accountId: string;
    let isReturningGuest = false;
    let isNewGuest = false;

    if (existing && existing.isGuest) {
      isReturningGuest = true;
      guestUserId = existing.id;
      const ctx = await getPrimaryAccountContextForUser(existing.id);
      if (!ctx?.accountId) {
        return NextResponse.json(
          {
            error: "GUEST_ACCOUNT_MISSING",
            message:
              "Could not resolve the existing guest's account. Contact an admin.",
          },
          { status: 500 },
        );
      }
      accountId = ctx.accountId;
    } else {
      const created = await createGuestUser({
        email,
        createdByUserId: token.uid,
      });
      isNewGuest = true;
      guestUserId = created.userId;
      accountId = created.accountId;

      await insertAuditLog({
        actor: token,
        action: "guest_user.created",
        entityType: "user",
        entityId: guestUserId,
        metadata: { email, accountId },
      });
    }

    // 2) Create the ticket under the guest's account, owned by the guest.
    //    The agent's action lives in audit_logs (step 5).
    const { ticketId } = await createTicket({
      accountId,
      createdByUserId: guestUserId,
      subject: parsed.data.subject,
      description: parsed.data.description ?? null,
      category: null,
      incidentTypeSelected: incident.code,
    });

    // 3) Auto-assign to the calling agent. Admins leave it unassigned so the
    //    ticket hits the normal queue.
    if (token.role === "agent") {
      await exec(
        `UPDATE tickets
            SET assigned_agent_id = ?,
                status = 'in_progress',
                updated_at = NOW()
          WHERE id = ?`,
        [token.uid, ticketId],
      );
    }

    // 4) Quoted incidents: record the quote.
    if (incident.pricingModel === "quoted" && parsed.data.quoteAmount) {
      await upsertTicketQuote({
        ticketId,
        quotedByUserId: token.uid,
        amount: parsed.data.quoteAmount,
        currency: parsed.data.quoteCurrency || getBillingCurrency(),
        note: parsed.data.quoteNote ?? null,
      });
    }

    // 5) Defensive: revoke any existing active link for this (brand-new)
    //    ticket before creating one.
    const existingLink = await findActiveByTicketId(ticketId);
    if (existingLink) {
      await revokeLink({ linkId: existingLink.id, revokedByUserId: token.uid });
    }

    // 6) Generate the credential. The rawToken leaves the server exactly
    //    once — in the response body below. It is NOT stored or logged
    //    anywhere; only its sha256 hash lives in the DB.
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    const { id: linkId } = await createMagicLink({
      ticketId,
      guestUserId,
      createdByUserId: token.uid,
      expiresAt,
      tokenHash,
    });

    const compoundToken = packLinkToken(linkId, rawToken);
    const baseUrl = getServerAppBaseUrl(req.nextUrl.origin);
    const linkUrl = `${baseUrl}/ticket-link/${compoundToken}`;

    // 7) Audit log stores only linkId — not the raw token or full URL.
    await insertAuditLog({
      actor: token,
      action: "ticket.magic_link.generated",
      entityType: "ticket",
      entityId: ticketId,
      metadata: {
        linkId,
        guestUserId,
        expiresAt: expiresAt.toISOString(),
        email,
        isNewGuest,
        isReturningGuest,
        incidentTypeSelected: incident.code,
      },
    });

    return NextResponse.json({
      status: "created",
      ticketId,
      linkId,
      linkUrl,
      expiresAt: expiresAt.toISOString(),
      isNewGuest,
      isReturningGuest,
      guestEmail: email,
    });
  } catch (e: any) {
    const msg = String(e?.message || "ERROR");
    if (msg.startsWith("FAIR_USAGE_LIMIT_REACHED:")) {
      const [, limit, planCode] = msg.split(":");
      return NextResponse.json(
        {
          error: "FAIR_USAGE_LIMIT_REACHED",
          message: `This account has reached its fair usage limit of ${limit} tickets for the current period.`,
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
