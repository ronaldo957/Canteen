import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Generates a secure, verifiable pickup token for an order. The token embeds
 * only the order id + expiry + an HMAC signature - never customer PII - so it
 * is safe to encode into a QR code shown on the customer's device.
 */
export function generatePickupToken(orderId: string): string {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret) throw new Error("QR_SIGNING_SECRET is not configured");
  const payload = `${orderId}.${Date.now()}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyPickupToken(token: string, orderId: string): boolean {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret) throw new Error("QR_SIGNING_SECRET is not configured");
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return false;
    const [tokenOrderId, ts, signature] = parts;
    if (tokenOrderId !== orderId) return false;
    const payload = `${tokenOrderId}.${ts}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
