import { NextResponse, type NextRequest } from "next/server";

import { requireAuthToken } from "@/lib/auth/server";
import {
  countOccupiedSeats,
  getAccountSummary,
  hasActiveCompanyMembership,
} from "@/lib/account-repo";
import {
  getAccountSubscription,
  syncAccountSubscriptionEntitlement,
} from "@/lib/billing/subscription-repo";
import { getCompanyTicketFairUsageSnapshot } from "@/lib/billing/fair-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (!token.accountId) {
      return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 400 });
    }

    await syncAccountSubscriptionEntitlement(token.accountId);

    const account = await getAccountSummary(token.accountId);
    if (!account) {
      return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });
    }

    const activeMembers = await countOccupiedSeats(token.accountId);
    const isCompanyMemberElsewhere = await hasActiveCompanyMembership(
      token.uid,
    );
    const subscription = await getAccountSubscription(token.accountId);
    const fairUsage = await getCompanyTicketFairUsageSnapshot(token.accountId);

    return NextResponse.json({
      account,
      activeMembers,
      subscription,
      fairUsage,
      viewer: {
        userId: token.uid,
        role: token.role,
        membershipRole: token.membershipRole,
        isCompanyMemberElsewhere,
      },
    });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
