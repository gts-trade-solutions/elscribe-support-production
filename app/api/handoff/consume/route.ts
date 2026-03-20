import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import { verifyHandoffToken } from "@/lib/handoff-token";
import { consumeHandoffTicket } from "@/lib/elscribe/handoff-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  token: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthToken(req);

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const claims = await verifyHandoffToken(parsed.data.token);

    const res = await consumeHandoffTicket({
      ticketId: claims.ticketId,
      tokenUserId: auth.uid,
      tokenAccountId: auth.accountId,
      tokenMembershipRole: auth.membershipRole,
    });

    if (res === "not_found")
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (res === "unauthorized")
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });

    return NextResponse.json({ ok: true, ticketId: claims.ticketId });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", message: e?.message || String(e) },
      { status: 500 },
    );
  }
}
