import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import { insertAuditLog } from "@/lib/audit-repo";
import {
  extendLink,
  findByLinkIdIncludingInactive,
} from "@/lib/magic-link-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  hours: z.coerce.number().int().min(1).max(168),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
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

    const linkId = ctx.params.id;
    const before = await findByLinkIdIncludingInactive(linkId);
    if (!before) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (before.revokedAt) {
      return NextResponse.json(
        {
          error: "REVOKED",
          message:
            "This link is revoked. Revoked links cannot be extended — have the agent generate a new one.",
        },
        { status: 409 },
      );
    }

    const hours = parsed.data.hours;
    const now = Date.now();
    const newExpiresAt = new Date(now + hours * 3600 * 1000);
    const oldExpiresAt = before.expiresAt;

    await extendLink({ linkId, newExpiresAt });
    const after = await findByLinkIdIncludingInactive(linkId);

    await insertAuditLog({
      actor: token,
      action: "ticket.magic_link.extended",
      entityType: "ticket",
      entityId: before.ticketId,
      metadata: {
        linkId,
        ticketId: before.ticketId,
        oldExpiresAt,
        newExpiresAt: newExpiresAt.toISOString(),
        hours,
      },
    });

    // Extending a link does NOT extend the guest's NextAuth session. If the
    // guest's 48h session has already expired, they must revisit the link —
    // the consume route re-issues a fresh 48h guest session on each valid
    // visit. That's the intended behavior: agents can hand a customer back
    // access without the customer needing a new URL.
    return NextResponse.json({ ok: true, link: after });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
