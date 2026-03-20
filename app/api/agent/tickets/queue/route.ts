import { NextResponse, type NextRequest } from "next/server";
import { requireAuthToken } from "@/lib/auth/server";
import { listAgentQueue } from "@/lib/ticket-repo";

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "agent" && token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const tickets = await listAgentQueue();
    return NextResponse.json({ tickets });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
