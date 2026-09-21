import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { carts, cartItems } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";
import { computeOrderTotals } from "@/lib/utils";

export async function getOrCreateCart(userId: string) {
  let cart = await db.query.carts.findFirst({ where: eq(carts.userId, userId) });
  if (!cart) {
    const [created] = await db.insert(carts).values({ userId }).returning();
    cart = created;
  }
  return cart;
}

export async function GET() {
  try {
    const session = await requireUser();
    const cart = await getOrCreateCart(session.sub);
    const items = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, cart.id),
      with: { menuItem: { with: { category: true } } },
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });

    const subtotal = items.reduce((sum, i) => sum + Number(i.menuItem?.price ?? 0) * i.quantity, 0);
    const totals = computeOrderTotals(subtotal);

    return NextResponse.json({ cart: { id: cart.id, items, subtotal, ...totals } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const session = await requireUser();
    const cart = await getOrCreateCart(session.sub);
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
