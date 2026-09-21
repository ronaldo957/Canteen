import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inventoryItems, inventoryTransactions } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

export async function GET() {
  try {
    await requireUser(["admin", "kitchen", "cashier"]);
    const rows = await db.query.inventoryItems.findMany({ orderBy: [asc(inventoryItems.name)] });
    return NextResponse.json({ items: rows });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(180),
  unit: z.string().trim().min(1).max(32),
  quantityOnHand: z.coerce.number().min(0).optional().default(0),
  minThreshold: z.coerce.number().min(0).optional().default(0),
  costPerUnit: z.coerce.number().min(0).optional().default(0),
});

export async function POST(req: Request) {
  try {
    const session = await requireUser(["admin"]);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const [row] = await db
      .insert(inventoryItems)
      .values({
        name: parsed.data.name,
        unit: parsed.data.unit,
        quantityOnHand: String(parsed.data.quantityOnHand),
        minThreshold: String(parsed.data.minThreshold),
        costPerUnit: String(parsed.data.costPerUnit),
      })
      .returning();

    if (parsed.data.quantityOnHand > 0) {
      await db.insert(inventoryTransactions).values({
        inventoryItemId: row.id,
        type: "restock",
        quantityChange: String(parsed.data.quantityOnHand),
        note: "Initial stock",
        createdBy: session.sub,
      });
    }

    return NextResponse.json({ item: row }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
