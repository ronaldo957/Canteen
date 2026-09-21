import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cartItems, menuItems } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";
import { getOrCreateCart } from "../route";

const addSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(20).optional().default(1),
  specialInstructions: z.string().trim().max(300).optional().default(""),
});

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const body = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { menuItemId, quantity, specialInstructions } = parsed.data;

    const item = await db.query.menuItems.findFirst({ where: eq(menuItems.id, menuItemId) });
    if (!item || !item.isAvailable) {
      return NextResponse.json({ error: "This item is currently unavailable" }, { status: 400 });
    }

    const cart = await getOrCreateCart(session.sub);
    const existing = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.cartId, cart.id), eq(cartItems.menuItemId, menuItemId)),
    });

    if (existing) {
      const [updated] = await db
        .update(cartItems)
        .set({ quantity: existing.quantity + quantity, specialInstructions })
        .where(eq(cartItems.id, existing.id))
        .returning();
      return NextResponse.json({ cartItem: updated });
    }

    const [created] = await db
      .insert(cartItems)
      .values({ cartId: cart.id, menuItemId, quantity, specialInstructions })
      .returning();
    return NextResponse.json({ cartItem: created }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
