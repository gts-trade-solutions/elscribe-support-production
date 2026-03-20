import crypto from "crypto";

/**
 * Verifies hex(hmac_sha256(secret, rawBody)) against x-elscribe-signature header.
 * Uses timingSafeEqual to avoid timing attacks.
 */
export function verifyElscribeHmac(params: {
  rawBody: string;
  signatureHex: string | null;
  secret: string | undefined;
}): boolean {
  const { rawBody, signatureHex, secret } = params;

  if (!secret) return false;
  if (!signatureHex) return false;

  const sig = signatureHex.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(sig)) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  // timingSafeEqual requires same length buffers
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
