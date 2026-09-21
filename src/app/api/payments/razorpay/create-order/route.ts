import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { requireUser, apiErrorResponse, ForbiddenError } from "@/lib/rbac";
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay";

const schema = z.object({ orderId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const order = await db.query.orders.findFirst({ where: eq(orders.id, parsed.data.orderId) });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (session.role === "customer" && order.userId !== session.sub) {
      throw new ForbiddenError("You cannot pay for this order");
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: "Online payments are not configured yet. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or choose Cash at Counter." },
        { status: 503 },
      );
    }

    const existingPayment = await db.query.payments.findFirst({
      where: and(eq(payments.orderId, order.id), eq(payments.method, "razorpay")),
    });

    if (existingPayment?.status === "paid") {
      return NextResponse.json({ error: "This order has already been paid" }, { status: 409 });
    }

    if (existingPayment?.razorpayOrderId) {
      return NextResponse.json({
        razorpayOrderId: existingPayment.razorpayOrderId,
        amount: Number(order.totalAmount),
        currency: "INR",
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    }

    const client = getRazorpayClient();
    const rpOrder = await client.orders.create({
      amount: Math.round(Number(order.totalAmount) * 100),
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: order.id },
    });

    if (existingPayment) {
      await db.update(payments).set({ razorpayOrderId: rpOrder.id, updatedAt: new Date() }).where(eq(payments.id, existingPayment.id));
    } else {
      await db.insert(payments).values({
        orderId: order.id,
        method: "razorpay",
        status: "pending",
        amount: order.totalAmount,
        razorpayOrderId: rpOrder.id,
        idempotencyKey: `${order.id}-razorpay`,
      });
    }

    return NextResponse.json({
      razorpayOrderId: rpOrder.id,
      amount: Number(order.totalAmount),
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
