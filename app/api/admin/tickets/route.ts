import { NextResponse, type NextRequest } from "next/server";
import { requireAuthToken } from "@/lib/auth/server";
import {
  getAdminMetrics,
  listAdminTickets,
  listAssignableOperators,
} from "@/lib/admin-repo";

function parseAssignment(value: string | null) {
  if (value === "assigned" || value === "unassigned" || value === "all") {
    return value;
  }
  return "all" as const;
}

function parseBilling(value: string | null) {
  if (
    value === "blocked" ||
    value === "included" ||
    value === "paid" ||
    value === "quote_pending" ||
    value === "all"
  ) {
    return value;
  }
  return "all" as const;
}

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const rawStatus = req.nextUrl.searchParams.get("status");
    const status = rawStatus && rawStatus !== "all" ? rawStatus : null;
    const assignment = parseAssignment(
      req.nextUrl.searchParams.get("assignment"),
    );
    const billing = parseBilling(req.nextUrl.searchParams.get("billing"));
    const search = req.nextUrl.searchParams.get("search");

    const [tickets, agents, metrics] = await Promise.all([
      listAdminTickets({ status, assignment, billing, search, limit: 300 }),
      listAssignableOperators(),
      getAdminMetrics(),
    ]);

    return NextResponse.json({ tickets, agents, metrics });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
