import { SignJWT, jwtVerify } from "jose";

type HandoffClaims = {
  ticketId: string;
  externalSessionId?: string | null;
};

function getSecret(): Uint8Array {
  const raw =
    process.env.ELSCRIBE_HANDOFF_TOKEN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "";
  if (!raw)
    throw new Error("Missing token secret (ELSCRIBE_HANDOFF_TOKEN_SECRET)");
  return new TextEncoder().encode(raw);
}

export async function signHandoffToken(params: {
  ticketId: string;
  externalSessionId?: string | null;
  ttlSeconds?: number;
}): Promise<string> {
  const ttl = params.ttlSeconds ?? 10 * 60; // 10 minutes
  const now = Math.floor(Date.now() / 1000);

  const claims: HandoffClaims = {
    ticketId: params.ticketId,
    externalSessionId: params.externalSessionId ?? null,
  };

  return new SignJWT(claims as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttl)
    .sign(getSecret());
}

export async function verifyHandoffToken(
  token: string,
): Promise<HandoffClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ["HS256"],
  });

  const ticketId = String((payload as any).ticketId || "");
  if (!ticketId) throw new Error("Invalid token");

  return {
    ticketId,
    externalSessionId: (payload as any).externalSessionId ?? null,
  };
}
