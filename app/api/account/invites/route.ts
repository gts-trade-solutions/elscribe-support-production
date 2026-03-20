import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";

import { requireAuthToken } from "@/lib/auth/server";
import {
  countOccupiedSeats,
  createInvite,
  getAccountSummary,
  listPendingInvites,
} from "@/lib/account-repo";
import { syncAccountSubscriptionEntitlement } from "@/lib/billing/subscription-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createInviteSchema = z.object({
  email: z.string().email(),
});

function makeInviteToken() {
  return `${crypto.randomUUID()}.${crypto.randomBytes(16).toString("hex")}`;
}

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (!token.accountId) {
      return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 400 });
    }
    if (token.membershipRole !== "owner") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const invites = await listPendingInvites(token.accountId);
    return NextResponse.json({ invites });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthToken(req);
    if (!auth.accountId) {
      return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 400 });
    }
    if (auth.membershipRole !== "owner") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await syncAccountSubscriptionEntitlement(auth.accountId);

    const body = await req.json().catch(() => null);
    const parsed = createInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
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

    const occupiedSeats = await countOccupiedSeats(auth.accountId);
    if (occupiedSeats >= account.seatLimit) {
      return NextResponse.json(
        {
          error: "SEAT_LIMIT_REACHED",
          seatLimit: account.seatLimit,
          activeMembers: occupiedSeats,
        },
        { status: 400 },
      );
    }

    const token = makeInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const created = await createInvite({
      accountId: auth.accountId,
      invitedByUserId: auth.uid,
      email: parsed.data.email,
      token,
      expiresAt,
    });

    const base = req.nextUrl.origin;
    const inviteUrl = `${base}/invite/${encodeURIComponent(created.token)}`;

    return NextResponse.json({ inviteUrl, invite: created });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
