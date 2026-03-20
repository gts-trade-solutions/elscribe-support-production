import { NextResponse, type NextRequest } from "next/server";

import { requireAuthToken } from "@/lib/auth/server";
import {
  convertAccountToCompany,
  getAccountSummary,
  hasActiveCompanyMembership,
} from "@/lib/account-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthToken(req);
    if (!auth.accountId) {
      return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 400 });
    }

    if (auth.membershipRole !== "owner") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // If this user is already an active *member* of any company account, they must not be
    // able to convert their (separate) individual account into a company account.
    const alreadyCompanyMember = await hasActiveCompanyMembership(auth.uid);
    if (alreadyCompanyMember) {
      return NextResponse.json(
        { error: "ALREADY_COMPANY_MEMBER" },
        { status: 403 },
      );
    }

    const account = await getAccountSummary(auth.accountId);
    if (!account) {
      return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });
    }

    if (account.type === "company") {
      return NextResponse.json({ ok: true, account });
    }

    await convertAccountToCompany(auth.accountId, auth.uid);
    const updated = await getAccountSummary(auth.accountId);

    return NextResponse.json({ ok: true, account: updated });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
