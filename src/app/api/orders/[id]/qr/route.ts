import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser, apiErrorResponse, ForbiddenError } from "@/lib/rbac";
import { generatePickupToken } from "@/lib/qr";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await params;
    const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (session.role === "customer" && order.userId !== session.sub) {
      throw new ForbiddenError("You cannot view this order");
    }
    if (!["ready", "accepted", "preparing"].includes(order.status)) {
      return NextResponse.json({ error: "QR code is only available once your order is being prepared" }, { status: 400 });
    }

    let token = order.pickupToken;
    if (!token) {
      token = generatePickupToken(order.id);
      await db.update(orders).set({ pickupToken: token }).where(eq(orders.id, id));
    }

    const qrPayload = JSON.stringify({ orderId: order.id, token });
    const dataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 320, color: { dark: "#1F2937", light: "#FAFAF7" } });

    return NextResponse.json({ qrCode: dataUrl, orderNumber: order.orderNumber });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
