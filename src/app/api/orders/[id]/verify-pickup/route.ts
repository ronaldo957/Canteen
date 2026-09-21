import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";
import { verifyPickupToken } from "@/lib/qr";

const schema = z.object({ token: z.string().min(10) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(["admin", "kitchen", "cashier"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (order.pickupVerifiedAt) {
      return NextResponse.json({ success: true, alreadyVerified: true, order });
    }

    const valid = order.pickupToken === parsed.data.token && verifyPickupToken(parsed.data.token, order.id);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired pickup code" }, { status: 400 });
    }
    if (order.status !== "ready") {
      return NextResponse.json({ error: `Order is not ready for pickup yet (status: ${order.status})` }, { status: 400 });
    }

    const [updated] = await db
      .update(orders)
      .set({ status: "completed", pickupVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
