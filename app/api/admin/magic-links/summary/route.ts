import { NextResponse, type NextRequest } from "next/server";
import { requireAuthToken } from "@/lib/auth/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SummaryRow = {
  active: number | string;
  expired: number | string;
  revoked: number | string;
  unvisited_active: number | string;
};

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const rows = await query<SummaryRow>(
      `SELECT
         SUM(CASE WHEN revoked_at IS NULL AND expires_at > UTC_TIMESTAMP() THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN revoked_at IS NULL AND expires_at <= UTC_TIMESTAMP() THEN 1 ELSE 0 END) AS expired,
         SUM(CASE WHEN revoked_at IS NOT NULL THEN 1 ELSE 0 END) AS revoked,
         SUM(CASE WHEN revoked_at IS NULL AND expires_at > UTC_TIMESTAMP() AND visit_count = 0 THEN 1 ELSE 0 END) AS unvisited_active
       FROM ticket_magic_links`,
    );

    const row = rows[0] ?? {
      active: 0,
      expired: 0,
      revoked: 0,
      unvisited_active: 0,
    };

    return NextResponse.json({
      active: Number(row.active ?? 0),
      expired: Number(row.expired ?? 0),
      revoked: Number(row.revoked ?? 0),
      unvisitedActive: Number(row.unvisited_active ?? 0),
    });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
