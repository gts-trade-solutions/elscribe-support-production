import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getPrimaryAccountContextForUser } from "@/lib/auth/user-repo";

export type AuthedToken = {
  uid: string;
  role: "customer" | "agent" | "admin";
  accountId: string | null;
  accountType: "individual" | "company" | null;
  membershipRole: "owner" | "member" | null;
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

  // Customer account context can change after invite acceptance / removal /
  // account conversion. Resolve the current context from DB on each request so
  // server authorization does not depend on a stale JWT.
  if (role === "customer") {
    const ctx = await getPrimaryAccountContextForUser(uid);
    if (ctx) {
      accountId = ctx.accountId;
      accountType = ctx.accountType;
      membershipRole = ctx.membershipRole;
    }
  }

  return { uid, role, accountId, accountType, membershipRole };
}
