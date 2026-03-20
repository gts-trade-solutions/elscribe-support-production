import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthToken } from "@/lib/auth/server";
import { decideAgentRoleRequest } from "@/lib/agent-role-requests-repo";

const BodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = BodySchema.parse(await req.json());
    await decideAgentRoleRequest({
      requestId: ctx.params.id,
      decision: body.decision,
      decidedByUserId: token.uid,
      decisionNote: body.note ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "ERROR";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "NOT_FOUND")
      return NextResponse.json({ error: msg }, { status: 404 });
    if (msg === "ALREADY_DECIDED")
      return NextResponse.json({ error: msg }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
