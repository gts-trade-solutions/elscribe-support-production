import { NextResponse, type NextRequest } from "next/server";

import { requireAuthToken } from "@/lib/auth/server";
import { countOccupiedSeats, getAccountSummary } from "@/lib/account-repo";
import {
  getCompanyPlanCatalog,
  getDisplayCurrency,
  getProcessorCurrency,
} from "@/lib/billing/pricing";
import {
  getAccountSubscription,
  syncAccountSubscriptionEntitlement,
} from "@/lib/billing/subscription-repo";
import { getLatestSubscriptionPayment } from "@/lib/billing/billing-repo";
import { getCompanyTicketFairUsageSnapshot } from "@/lib/billing/fair-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "customer") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (!token.accountId) {
      return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 400 });
    }

    await syncAccountSubscriptionEntitlement(token.accountId);

    const account = await getAccountSummary(token.accountId);
    if (!account) {
      return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });
    }

    const occupiedSeats = await countOccupiedSeats(token.accountId);
    const subscription = await getAccountSubscription(token.accountId);
    const latestPayment = await getLatestSubscriptionPayment(token.accountId);
    const fairUsage = await getCompanyTicketFairUsageSnapshot(token.accountId);

    return NextResponse.json({
      account,
      occupiedSeats,
      subscription,
      latestPayment,
      fairUsage,
      plans: getCompanyPlanCatalog(),
      displayCurrency: getDisplayCurrency(),
      processorCurrency: getProcessorCurrency(),
      canManage:
        token.accountType === "company" && token.membershipRole === "owner",
    });
  } catch (e: any) {
    const msg = e?.message || "SERVER_ERROR";
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "UNAUTHORIZED" : "SERVER_ERROR" },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
