import {
  findByLinkIdIncludingInactive,
  type MagicLinkRow,
} from "@/lib/magic-link-repo";
import {
  hashToken,
  timingSafeEqualHex,
  unpackLinkToken,
} from "@/lib/magic-link-token";

// Shared validator for the compound `<linkId>.<rawToken>` URL credential.
// Used by both the consume route (to validate once and return ticket data)
// and the NextAuth "guest-magic-link" credentials provider (to validate
// again when minting the session). Centralizing it keeps the two callers
// in lock-step on revoke/expiry semantics.
//
// Order mirrors the Phase 3 spec: parse → row lookup → revoke/expiry →
// constant-time hash compare. A hash mismatch is reported as `not_found`
// so an attacker who guesses a linkId cannot distinguish "wrong token" from
// "no such link" via this endpoint.
export type MagicLinkValidation =
  | { ok: true; row: MagicLinkRow }
  | { ok: false; code: "invalid" | "not_found" | "revoked" | "expired" };

export async function validateMagicLinkCompound(
  compound: string,
): Promise<MagicLinkValidation> {
  const parts = unpackLinkToken(compound);
  if (!parts) return { ok: false, code: "invalid" };

  const row = await findByLinkIdIncludingInactive(parts.linkId);
  if (!row) return { ok: false, code: "not_found" };

  if (row.revokedAt) return { ok: false, code: "revoked" };
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return { ok: false, code: "expired" };
  }

  const expectedHash = hashToken(parts.rawToken);
  if (!timingSafeEqualHex(expectedHash, row.tokenHash)) {
    return { ok: false, code: "not_found" };
  }

  return { ok: true, row };
}
