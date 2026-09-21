import "server-only";
import { eq, sql } from "drizzle-orm";
import type { db as dbType } from "@/db";
import { inventoryItems, inventoryTransactions, notifications, orderItems, recipes } from "@/db/schema";

type Tx = Parameters<Parameters<typeof dbType.transaction>[0]>[0];

/**
 * Deducts recipe ingredients from inventory for every item in an order.
 * Must be called from within a DB transaction with the parent order row
 * already locked (SELECT ... FOR UPDATE) by the caller to avoid race
 * conditions between concurrent order confirmations.
 */
export async function deductInventoryForOrder(tx: Tx, orderId: string, createdBy?: string | null) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  // Aggregate required quantity per inventory item across all order lines.
  const requirements = new Map<string, number>();
  for (const item of items) {
    if (!item.menuItemId) continue;
    const itemRecipes = await tx.select().from(recipes).where(eq(recipes.menuItemId, item.menuItemId));
    for (const r of itemRecipes) {
      const needed = Number(r.quantityRequired) * item.quantity;
      requirements.set(r.inventoryItemId, (requirements.get(r.inventoryItemId) ?? 0) + needed);
    }
  }

  for (const [inventoryItemId, needed] of requirements) {
    const [locked] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, inventoryItemId))
      .for("update");
    if (!locked) continue;

    const current = Number(locked.quantityOnHand);
    const deducted = Math.min(current, needed);
    const newQty = Math.max(0, current - needed);

    await tx
      .update(inventoryItems)
      .set({ quantityOnHand: String(newQty), updatedAt: new Date() })
      .where(eq(inventoryItems.id, inventoryItemId));

    await tx.insert(inventoryTransactions).values({
      inventoryItemId,
      type: "deduction",
      quantityChange: String(-deducted),
      orderId,
      note: deducted < needed ? "Insufficient stock - deducted to zero" : "Order confirmed",
      createdBy: createdBy ?? null,
    });

    if (newQty <= Number(locked.minThreshold)) {
      const existingAlert = await tx.query.notifications.findFirst({
        where: (fields, { and, eq: eqOp, isNull }) =>
          and(eqOp(fields.type, "low_stock"), isNull(fields.userId), eqOp(fields.isRead, false)),
      });
      const metadata = { inventoryItemId, name: locked.name, quantityOnHand: newQty };
      if (!existingAlert) {
        await tx.insert(notifications).values({
          userId: null,
          type: "low_stock",
          title: "Low stock alert",
          message: `${locked.name} is running low (${newQty} ${locked.unit} left).`,
          metadata,
        });
      }
    }
  }
}

/** Reverses inventory deduction for a cancelled order (restocks ingredients). */
export async function restockInventoryForOrder(tx: Tx, orderId: string, createdBy?: string | null) {
  const deductions = await tx
    .select()
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.orderId, orderId));

  for (const txn of deductions) {
    if (txn.type !== "deduction") continue;
    const restoreQty = Math.abs(Number(txn.quantityChange));
    if (restoreQty <= 0) continue;

    await tx
      .update(inventoryItems)
      .set({ quantityOnHand: sql`${inventoryItems.quantityOnHand} + ${restoreQty}`, updatedAt: new Date() })
      .where(eq(inventoryItems.id, txn.inventoryItemId));

    await tx.insert(inventoryTransactions).values({
      inventoryItemId: txn.inventoryItemId,
      type: "adjustment",
      quantityChange: String(restoreQty),
      orderId,
      note: "Order cancelled - stock restored",
      createdBy: createdBy ?? null,
    });
  }
}
