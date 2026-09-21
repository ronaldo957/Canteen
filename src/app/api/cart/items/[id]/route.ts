import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cartItems } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

async function assertOwnership(cartItemId: string, userId: string) {
  const row = await db.query.cartItems.findFirst({
    where: eq(cartItems.id, cartItemId),
    with: { cart: true },
  });
  if (!row || row.cart.userId !== userId) return null;
  return row;
}

const updateSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(20).optional(),
  specialInstructions: z.string().trim().max(300).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await params;
    const owned = await assertOwnership(id, session.sub);
    if (!owned) return NextResponse.json({ error: "Cart item not found" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const [row] = await db.update(cartItems).set(parsed.data).where(eq(cartItems.id, id)).returning();
    return NextResponse.json({ cartItem: row });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await params;
    const owned = await assertOwnership(id, session.sub);
    if (!owned) return NextResponse.json({ error: "Cart item not found" }, { status: 404 });

    await db.delete(cartItems).where(eq(cartItems.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

