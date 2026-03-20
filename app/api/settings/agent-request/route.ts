import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthToken } from "@/lib/auth/server";
import {
  createAgentRoleRequest,
  getMyLatestAgentRoleRequest,
} from "@/lib/agent-role-requests-repo";

const BodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    const latest = await getMyLatestAgentRoleRequest(token.uid);
    return NextResponse.json({ latest });
  } catch (e: any) {
    const msg = e?.message ?? "ERROR";
    const code = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);

    // Only customers can request (agents/admins don't need this)
    if (token.role !== "customer") {
      return NextResponse.json(
        { error: "ONLY_CUSTOMER_CAN_REQUEST" },
        { status: 403 },
      );
    }

    const body = BodySchema.parse(await req.json());
    const id = crypto.randomUUID();

    await createAgentRoleRequest({
      id,
      userId: token.uid,
      accountId: token.accountId ?? null,
      reason: body.reason ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "ERROR";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "REQUEST_ALREADY_PENDING")
      return NextResponse.json({ error: msg }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
