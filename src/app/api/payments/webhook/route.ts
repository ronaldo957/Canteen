import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { deductInventoryForOrder } from "@/lib/inventory";

/**
 * Razorpay webhook handler. Configure this URL in Dashboard > Settings > Webhooks
 * with events: payment.captured, payment.failed. This is the source of truth for
 * payment status alongside the client-side verify endpoint - both are idempotent.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload: { payment: { entity: { id: string; order_id: string; status: string } } };
  };

  const entity = event.payload?.payment?.entity;
  if (!entity) return NextResponse.json({ received: true });

  const payment = await db.query.payments.findFirst({ where: eq(payments.razorpayOrderId, entity.order_id) });
  if (!payment) return NextResponse.json({ received: true });

  // Idempotent: only act if the payment isn't already in the terminal state the event implies.
  if (event.event === "payment.captured" && payment.status !== "paid") {
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(payments).where(eq(payments.id, payment.id)).for("update");
      if (!locked || locked.status === "paid") return;

      await tx
        .update(payments)
        .set({ status: "paid", razorpayPaymentId: entity.id, updatedAt: new Date() })
        .where(eq(payments.id, payment.id));

      const [order] = await tx.select().from(orders).where(eq(orders.id, locked.orderId)).for("update");
      if (order && order.status === "placed") {
        if (!order.inventoryDeducted) {
          await deductInventoryForOrder(tx, order.id, order.userId);
        }
        await tx
          .update(orders)
          .set({ status: "accepted", inventoryDeducted: true, updatedAt: new Date() })
          .where(eq(orders.id, order.id));
      }
    });
  }

  if (event.event === "payment.failed" && payment.status === "pending") {
    await db
      .update(payments)
      .set({ status: "failed", failureReason: "Payment failed at gateway", updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
  }

  return NextResponse.json({ received: true });
}
