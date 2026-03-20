import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthToken } from "@/lib/auth/server";
import { getAccountSummary, removeMember } from "@/lib/account-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthToken(req);
    if (!auth.accountId) {
      return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 400 });
    }

    if (auth.membershipRole !== "owner") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const account = await getAccountSummary(auth.accountId);
    if (!account) {
      return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });
    }
    if (account.type !== "company") {
      return NextResponse.json(
        { error: "NOT_COMPANY_ACCOUNT" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    await removeMember({
      accountId: auth.accountId,
      targetUserId: parsed.data.userId,
      actorUserId: auth.uid,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
