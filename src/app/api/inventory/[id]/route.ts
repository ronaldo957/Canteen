import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inventoryItems, inventoryTransactions } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(180).optional(),
  unit: z.string().trim().min(1).max(32).optional(),
  minThreshold: z.coerce.number().min(0).optional(),
  costPerUnit: z.coerce.number().min(0).optional(),
  restockBy: z.coerce.number().optional(), // positive = restock, negative = manual adjustment
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser(["admin"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const result = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, id)).for("update");
      if (!current) throw new Error("Inventory item not found");

      const updateValues: Record<string, unknown> = { updatedAt: new Date() };
      if (parsed.data.name !== undefined) updateValues.name = parsed.data.name;
      if (parsed.data.unit !== undefined) updateValues.unit = parsed.data.unit;
      if (parsed.data.minThreshold !== undefined) updateValues.minThreshold = String(parsed.data.minThreshold);
      if (parsed.data.costPerUnit !== undefined) updateValues.costPerUnit = String(parsed.data.costPerUnit);

      if (parsed.data.restockBy) {
        const newQty = Math.max(0, Number(current.quantityOnHand) + parsed.data.restockBy);
        updateValues.quantityOnHand = String(newQty);
        await tx.insert(inventoryTransactions).values({
          inventoryItemId: id,
          type: parsed.data.restockBy > 0 ? "restock" : "adjustment",
          quantityChange: String(parsed.data.restockBy),
          note: parsed.data.restockBy > 0 ? "Manual restock" : "Manual adjustment",
          createdBy: session.sub,
        });
      }

      const [updated] = await tx.update(inventoryItems).set(updateValues).where(eq(inventoryItems.id, id)).returning();
      return updated;
    });

    return NextResponse.json({ item: result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(["admin"]);
    const { id } = await params;
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
