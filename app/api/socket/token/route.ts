import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { requireAuthToken } from "@/lib/auth/server";

/**
 * Mint a short-lived token specifically for Socket.IO authentication.
 *
 * Why:
 * - next-auth/jwt.getToken() works reliably in Next route handlers,
 *   but may return null in the Socket.IO handshake due to subtle
 *   differences in the request object.
 * - This endpoint uses the same auth path as the REST API and then
 *   issues a signed token the Socket.IO server can verify.
 */
export async function GET(req: NextRequest) {
  try {
    const authed = await requireAuthToken(req);

    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    if (!secret) {
      return NextResponse.json(
        { error: "server_misconfigured" },
        { status: 500 },
      );
    }

    const key = new TextEncoder().encode(secret);

    // 5 minutes is plenty for handshake; client can re-fetch on connect_error.
    const token = await new SignJWT({
      uid: authed.uid,
      role: authed.role,
      accountId: authed.accountId,
      accountType: authed.accountType,
      membershipRole: authed.membershipRole,
      purpose: "socket_auth",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
