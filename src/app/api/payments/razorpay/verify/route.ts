import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { requireUser, apiErrorResponse, ForbiddenError } from "@/lib/rbac";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { deductInventoryForOrder } from "@/lib/inventory";

const schema = z.object({
  orderId: z.string().uuid(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (session.role === "customer" && order.userId !== session.sub) {
      throw new ForbiddenError("You cannot verify this payment");
    }

    // Never trust the client: verify the HMAC signature server-side.
    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.razorpayOrderId, razorpay_order_id))
        .for("update");

      if (!payment) throw new Error("Payment record not found for this order");

      if (payment.status === "paid") {
        return { alreadyPaid: true, order };
      }

      if (!isValid) {
        await tx
          .update(payments)
          .set({ status: "failed", failureReason: "Signature verification failed", updatedAt: new Date() })
          .where(eq(payments.id, payment.id));
        throw new Error("Payment verification failed. If money was deducted, it will be auto-refunded.");
      }

      await tx
        .update(payments)
        .set({
          status: "paid",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      const [lockedOrder] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
      let updatedOrder = lockedOrder;
      if (lockedOrder && lockedOrder.status === "placed") {
        if (!lockedOrder.inventoryDeducted) {
          await deductInventoryForOrder(tx, lockedOrder.id, lockedOrder.userId);
        }
        const [next] = await tx
          .update(orders)
          .set({ status: "accepted", inventoryDeducted: true, updatedAt: new Date() })
          .where(eq(orders.id, orderId))
          .returning();
        updatedOrder = next;
      }

      return { alreadyPaid: false, order: updatedOrder };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
