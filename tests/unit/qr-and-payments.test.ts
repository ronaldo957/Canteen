import { describe, expect, it } from "vitest";
import { randomUUID, createHmac } from "crypto";
import { generatePickupToken, verifyPickupToken } from "@/lib/qr";
import { verifyPaymentSignature } from "@/lib/razorpay";

describe("QR pickup token", () => {
  it("generates a token that verifies successfully for the correct order", () => {
    const orderId = randomUUID();
    const token = generatePickupToken(orderId);
    expect(verifyPickupToken(token, orderId)).toBe(true);
  });

  it("rejects a token when checked against a different order id", () => {
    const orderId = randomUUID();
    const otherOrderId = randomUUID();
    const token = generatePickupToken(orderId);
    expect(verifyPickupToken(token, otherOrderId)).toBe(false);
  });

  it("rejects a tampered token", () => {
    const orderId = randomUUID();
    const token = generatePickupToken(orderId);
    const tampered = token.slice(0, -2) + "xx";
    expect(verifyPickupToken(tampered, orderId)).toBe(false);
  });

  it("never encodes customer PII - only order id, timestamp and signature", () => {
    const orderId = randomUUID();
    const token = generatePickupToken(orderId);
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    expect(decoded.split(".")).toHaveLength(3);
    expect(decoded).not.toMatch(/@/); // no email addresses embedded
  });
});

describe("Razorpay payment signature verification", () => {
  it("accepts a correctly signed payment", () => {
    const secret = process.env.RAZORPAY_KEY_SECRET as string;
    const orderId = "order_test123";
    const paymentId = "pay_test456";
    const signature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    expect(verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
  });

  it("rejects a forged signature (never trusts the client blindly)", () => {
    expect(
      verifyPaymentSignature({ orderId: "order_test123", paymentId: "pay_test456", signature: "not-a-real-signature" }),
    ).toBe(false);
  });
});
