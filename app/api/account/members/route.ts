import { NextResponse, type NextRequest } from "next/server";

import { requireAuthToken } from "@/lib/auth/server";
import { listActiveMembers } from "@/lib/account-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (!token.accountId) {
      return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 400 });
    }

    // Only the account owner should be able to view members.
    if (token.membershipRole !== "owner") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const members = await listActiveMembers(token.accountId);
    return NextResponse.json({ members });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
