import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { menuItems, recipes } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.query.menuItems.findFirst({
    where: eq(menuItems.id, id),
    with: { category: true, recipes: { with: { inventoryItem: true } } },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ item });
}

const updateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(1000).optional(),
  price: z.coerce.number().positive().optional(),
  imageUrl: z.string().trim().optional(),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isSpecialToday: z.boolean().optional(),
  prepTimeMinutes: z.coerce.number().int().positive().optional(),
  calories: z.coerce.number().int().positive().optional(),
  recipe: z
    .array(z.object({ inventoryItemId: z.string().uuid(), quantityRequired: z.coerce.number().positive() }))
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(["admin"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { recipe, ...rest } = parsed.data;
    const updateValues: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (rest.price !== undefined) updateValues.price = String(rest.price);

    const [row] = await db.update(menuItems).set(updateValues).where(eq(menuItems.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    if (recipe) {
      await db.delete(recipes).where(eq(recipes.menuItemId, id));
      if (recipe.length) {
        await db.insert(recipes).values(
          recipe.map((r) => ({
            menuItemId: id,
            inventoryItemId: r.inventoryItemId,
            quantityRequired: String(r.quantityRequired),
          })),
        );
      }
    }

    return NextResponse.json({ item: row });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(["admin"]);
    const { id } = await params;
    const [row] = await db
      .update(menuItems)
      .set({ isAvailable: false, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
