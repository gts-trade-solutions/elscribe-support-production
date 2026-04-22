import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getPrimaryAccountContextForUser } from "@/lib/auth/user-repo";

export type AuthedToken = {
  uid: string;
  role: "customer" | "agent" | "admin";
  accountId: string | null;
  accountType: "individual" | "company" | null;
  membershipRole: "owner" | "member" | null;
  // True when the session was issued by the "guest-magic-link" provider.
  // Guest sessions are time-bounded (see sessionExpiresAt) and the account
  // attached to them is a throwaway individual account created by the
  // magic-link generation API.
  isGuest: boolean;
  // ISO string; only populated for guest sessions. Enforced both here and
  // in the NextAuth jwt callback.
  sessionExpiresAt: string | null;
};

export async function requireAuthToken(req: NextRequest): Promise<AuthedToken> {
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as any;
  if (!token?.uid) {
    throw new Error("UNAUTHORIZED");
  }

  const uid = String(token.uid);
  const role = ((token.role as any) ?? "customer") as AuthedToken["role"];
  let accountId = (token.accountId as any) ?? null;
  let accountType = (token.accountType as any) ?? null;
  let membershipRole = (token.membershipRole as any) ?? null;
  const isGuest = Boolean(token.isGuest);
  const sessionExpiresAt = (token.sessionExpiresAt as string | null) ?? null;

  // Belt-and-suspenders on top of the jwt callback: if a guest session
  // reaches an API route past its expiry, reject it here too. Prevents a
  // stale token from succeeding if the callback ever fails to wipe.
  if (isGuest && sessionExpiresAt) {
    const exp = new Date(sessionExpiresAt).getTime();
    if (!Number.isFinite(exp) || exp < Date.now()) {
      throw new Error("UNAUTHORIZED");
    }
  }

  // Customer account context can change after invite acceptance / removal /
  // account conversion. Resolve the current context from DB on each request so
  // server authorization does not depend on a stale JWT.
  // Guests don't participate in invites and their account context is fixed
  // by the generation API, so we skip the lookup for them.
  if (role === "customer" && !isGuest) {
    const ctx = await getPrimaryAccountContextForUser(uid);
    if (ctx) {
      accountId = ctx.accountId;
      accountType = ctx.accountType;
      membershipRole = ctx.membershipRole;
    }
  }

  return {
    uid,
    role,
    accountId,
    accountType,
    membershipRole,
    isGuest,
    sessionExpiresAt,
  };
}
