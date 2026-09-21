import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";
import { deductInventoryForOrder } from "@/lib/inventory";

const schema = z.object({ orderId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const session = await requireUser(["cashier", "admin"]);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.orderId, parsed.data.orderId))
        .for("update");
      if (!payment) throw new Error("Payment record not found");
      if (payment.status === "paid") return { alreadyPaid: true };

      await tx
        .update(payments)
        .set({ status: "paid", receivedBy: session.sub, updatedAt: new Date() })
        .where(eq(payments.id, payment.id));

      const [order] = await tx.select().from(orders).where(eq(orders.id, parsed.data.orderId)).for("update");
      if (order && order.status === "placed") {
        if (!order.inventoryDeducted) {
          await deductInventoryForOrder(tx, order.id, session.sub);
        }
        await tx
          .update(orders)
          .set({ status: "accepted", inventoryDeducted: true, updatedAt: new Date() })
          .where(eq(orders.id, order.id));
      }
      return { alreadyPaid: false };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
