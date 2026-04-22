import { NextResponse, type NextRequest } from "next/server";
import { requireAuthToken } from "@/lib/auth/server";
import { listAdminUsers } from "@/lib/admin-repo";

function parseRole(value: string | null) {
  if (value === "customer" || value === "agent" || value === "admin") {
    return value;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const role = parseRole(req.nextUrl.searchParams.get("role"));
    const search = req.nextUrl.searchParams.get("search");
    const includeGuests =
      req.nextUrl.searchParams.get("includeGuests") === "1";
    const users = await listAdminUsers({
      role,
      search,
      includeGuests,
      limit: 300,
    });

    return NextResponse.json({ users });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
