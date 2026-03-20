import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAuthToken } from "@/lib/auth/server";
import { listPendingAgentRoleRequests } from "@/lib/agent-role-requests-repo";

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const items = await listPendingAgentRoleRequests();
    return NextResponse.json({ items });
  } catch (e: any) {
    const msg = e?.message ?? "ERROR";
    const code = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
