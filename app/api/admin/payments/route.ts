import { NextResponse, type NextRequest } from "next/server";
import { requireAuthToken } from "@/lib/auth/server";
import {
  getAdminPaymentMetrics,
  listAdminPayments,
  type AdminPaymentStatusFilter,
  type AdminPaymentTypeFilter,
} from "@/lib/admin-payments-repo";

function parseStatus(value: string | null): AdminPaymentStatusFilter {
  if (
    value === "pending" ||
    value === "succeeded" ||
    value === "failed" ||
    value === "refunded" ||
    value === "all"
  ) {
    return value;
  }
  return "all";
}

function parseType(value: string | null): AdminPaymentTypeFilter {
  if (value === "incident" || value === "subscription" || value === "all") {
    return value;
  }
  return "all";
}

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const status = parseStatus(req.nextUrl.searchParams.get("status"));
    const type = parseType(req.nextUrl.searchParams.get("type"));
    const search = req.nextUrl.searchParams.get("search");

    const [payments, metrics] = await Promise.all([
      listAdminPayments({ status, type, search, limit: 400 }),
      getAdminPaymentMetrics(),
    ]);

    return NextResponse.json({ payments, metrics });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
