import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { canteenSettings, notifications, orders } from "@/db/schema";
import { requireUser, apiErrorResponse, ForbiddenError } from "@/lib/rbac";
import { deductInventoryForOrder, restockInventoryForOrder } from "@/lib/inventory";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await params;
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { items: true, payments: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (session.role === "customer" && order.userId !== session.sub) {
      throw new ForbiddenError("You cannot view this order");
    }
    return NextResponse.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const updateSchema = z.object({
  status: z.enum(["placed", "accepted", "preparing", "ready", "completed", "cancelled"]).optional(),
  cancelReason: z.string().trim().max(300).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { status: nextStatus, cancelReason } = parsed.data;
    if (!nextStatus) return NextResponse.json({ error: "status is required" }, { status: 400 });

    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
      if (!order) throw new Error("Order not found");

      if (session.role === "customer") {
        if (order.userId !== session.sub) throw new ForbiddenError("You cannot modify this order");
        if (nextStatus !== "cancelled") throw new ForbiddenError("Customers may only cancel their own orders");
        const settings = await tx.query.canteenSettings.findFirst({ where: eq(canteenSettings.key, "allow_cancellation_within_minutes") });
        const windowMinutes = Number((settings?.value as { value?: number })?.value ?? 5);
        const ageMinutes = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
        const cancellable = order.status === "placed" || (order.status === "accepted" && ageMinutes <= windowMinutes);
        if (!cancellable) {
          throw new Error("This order can no longer be cancelled. Please contact the counter.");
        }
      } else if (!["admin", "kitchen", "cashier"].includes(session.role)) {
        throw new ForbiddenError("Not authorized");
      }

      if (nextStatus !== "cancelled") {
        const allowed = STATUS_TRANSITIONS[order.status] ?? [];
        if (!allowed.includes(nextStatus)) {
          throw new Error(`Cannot move order from "${order.status}" to "${nextStatus}"`);
        }
      } else if (order.status === "completed" || order.status === "cancelled") {
        throw new Error("This order cannot be cancelled anymore");
      }

      const updateValues: Record<string, unknown> = { status: nextStatus, updatedAt: new Date() };
      if (nextStatus === "cancelled") updateValues.cancelReason = cancelReason ?? "Cancelled";
      if (nextStatus === "completed") updateValues.pickupVerifiedAt = order.pickupVerifiedAt ?? new Date();

      if (nextStatus === "accepted" && !order.inventoryDeducted) {
        await deductInventoryForOrder(tx, order.id, session.sub);
        updateValues.inventoryDeducted = true;
      }

      if (nextStatus === "cancelled" && order.inventoryDeducted) {
        await restockInventoryForOrder(tx, order.id, session.sub);
      }

      const [updated] = await tx.update(orders).set(updateValues).where(eq(orders.id, id)).returning();

      if (order.userId) {
        await tx.insert(notifications).values({
          userId: order.userId,
          type: "order_status",
          title: `Order ${order.orderNumber} ${nextStatus === "cancelled" ? "cancelled" : `is now "${nextStatus}"`}`,
          message:
            nextStatus === "cancelled"
              ? `Your order was cancelled. ${cancelReason ?? ""}`.trim()
              : `Your order status changed to ${nextStatus}.`,
          metadata: { orderId: order.id, status: nextStatus },
        });
      }

      return updated;
    });

    return NextResponse.json({ order: result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
