import { NextResponse, type NextRequest } from "next/server";
import { requireAuthToken } from "@/lib/auth/server";
import { insertAuditLog } from "@/lib/audit-repo";
import {
  findByLinkIdIncludingInactive,
  revokeLink,
} from "@/lib/magic-link-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const linkId = ctx.params.id;
    const before = await findByLinkIdIncludingInactive(linkId);
    if (!before) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (before.revokedAt) {
      return NextResponse.json(
        { error: "ALREADY_REVOKED" },
        { status: 409 },
      );
    }

    await revokeLink({ linkId, revokedByUserId: token.uid });
    const after = await findByLinkIdIncludingInactive(linkId);

    await insertAuditLog({
      actor: token,
      action: "ticket.magic_link.revoked",
      entityType: "ticket",
      entityId: before.ticketId,
      metadata: { linkId, ticketId: before.ticketId },
    });

    return NextResponse.json({ ok: true, link: after });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
