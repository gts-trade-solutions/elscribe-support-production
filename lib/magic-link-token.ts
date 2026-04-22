import crypto from "node:crypto";

// The URL credential is the compound string `<linkId>.<rawToken>`.
// We store only the sha256 of the rawToken in the DB; the linkId is the row PK.
// Verification: look up the row by linkId, then constant-time compare
// hashToken(rawToken) against row.token_hash.
// No JWT is used for the link itself. Phase 3 will add a separate signer for
// the guest session cookie.

const COMPOUND_SEPARATOR = ".";

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function packLinkToken(linkId: string, rawToken: string): string {
  if (linkId.includes(COMPOUND_SEPARATOR)) {
    throw new Error("linkId must not contain '.'");
  }
  if (rawToken.length === 0) {
    throw new Error("rawToken must not be empty");
  }
  return `${linkId}${COMPOUND_SEPARATOR}${rawToken}`;
}

export function unpackLinkToken(
  compound: string,
): { linkId: string; rawToken: string } | null {
  if (typeof compound !== "string") return null;
  const idx = compound.indexOf(COMPOUND_SEPARATOR);
  if (idx <= 0 || idx >= compound.length - 1) return null;
  const linkId = compound.slice(0, idx);
  const rawToken = compound.slice(idx + 1);
  if (!linkId || !rawToken) return null;
  return { linkId, rawToken };
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let bufA: Buffer;
  let bufB: Buffer;
  try {
    bufA = Buffer.from(a, "hex");
    bufB = Buffer.from(b, "hex");
  } catch {
    return false;
  }
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  // Cast: @types/node narrows timingSafeEqual to Uint8Array<ArrayBuffer>, but
  // Buffer.from returns Uint8Array<ArrayBufferLike>. Runtime is identical.
  return (crypto.timingSafeEqual as (a: unknown, b: unknown) => boolean)(
    bufA,
    bufB,
  );
}
