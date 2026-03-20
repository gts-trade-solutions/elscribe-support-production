import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthToken } from "@/lib/auth/server";
import { acceptInvite } from "@/lib/account-repo";
import { getUserEmailById } from "@/lib/auth/user-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthToken(req);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const email = await getUserEmailById(auth.uid);
    if (!email) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const result = await acceptInvite({
      token: parsed.data.token,
      userId: auth.uid,
      userEmail: email,
    });

    return NextResponse.json({ ok: true, accountId: result.accountId });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    if (
      msg === "INVITE_NOT_FOUND" ||
      msg === "INVITE_NOT_PENDING" ||
      msg === "INVITE_EXPIRED" ||
      msg === "INVITE_EMAIL_MISMATCH" ||
      msg === "SEAT_LIMIT_REACHED"
    ) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
