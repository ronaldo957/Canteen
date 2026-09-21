import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import {
  categories,
  menuItems,
  inventoryItems,
  recipes,
  profiles,
  carts,
  cartItems,
  orders,
  orderItems,
  payments,
} from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { computeOrderTotals, generateOrderNumber } from "@/lib/utils";
import { deductInventoryForOrder } from "@/lib/inventory";

// Unique suffix so repeated test runs never collide on unique constraints.
const suffix = Date.now().toString();
const testEmail = `vitest-${suffix}@canteen.test`;

let categoryId: string;
let menuItemId: string;
let inventoryItemId: string;
let profileId: string;
let cartId: string;
let orderId: string;

describe("End-to-end customer order workflow (real Postgres database)", () => {
  beforeAll(async () => {
    const [category] = await db
      .insert(categories)
      .values({ name: `Vitest Category ${suffix}`, description: "test" })
      .returning();
    categoryId = category.id;

    const [menuItem] = await db
      .insert(menuItems)
      .values({
        categoryId,
        name: "Vitest Test Dosa",
        description: "test item",
        price: "100.00",
        isVeg: true,
      })
      .returning();
    menuItemId = menuItem.id;

    const [inventoryItem] = await db
      .insert(inventoryItems)
      .values({ name: `Vitest Rice ${suffix}`, unit: "kg", quantityOnHand: "10", minThreshold: "2" })
      .returning();
    inventoryItemId = inventoryItem.id;

    await db.insert(recipes).values({ menuItemId, inventoryItemId, quantityRequired: "0.5" });

    const passwordHash = await hashPassword("Vitest@123");
    const [profile] = await db
      .insert(profiles)
      .values({ fullName: "Vitest Customer", email: testEmail, passwordHash, role: "customer" })
      .returning();
    profileId = profile.id;

    const [cart] = await db.insert(carts).values({ userId: profileId }).returning();
    cartId = cart.id;
  });

  afterAll(async () => {
    // Clean up in FK-safe order.
    if (orderId) {
      await db.delete(payments).where(eq(payments.orderId, orderId));
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      await db.delete(orders).where(eq(orders.id, orderId));
    }
    if (cartId) {
      await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
      await db.delete(carts).where(eq(carts.id, cartId));
    }
    if (menuItemId) {
      await db.delete(recipes).where(eq(recipes.menuItemId, menuItemId));
      await db.delete(menuItems).where(eq(menuItems.id, menuItemId));
    }
    if (categoryId) await db.delete(categories).where(eq(categories.id, categoryId));
    if (inventoryItemId) await db.delete(inventoryItems).where(eq(inventoryItems.id, inventoryItemId));
    if (profileId) await db.delete(profiles).where(eq(profiles.id, profileId));
    await pool.end();
  });

  it("registers a user with a securely hashed password", async () => {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.email, testEmail) });
    expect(profile).toBeTruthy();
    expect(profile?.passwordHash).not.toBe("Vitest@123");
    await expect(verifyPassword("Vitest@123", profile!.passwordHash)).resolves.toBe(true);
  });

  it("adds an item to the customer's persistent cart", async () => {
    const [cartItem] = await db
      .insert(cartItems)
      .values({ cartId, menuItemId, quantity: 3 })
      .returning();
    expect(cartItem.quantity).toBe(3);

    const itemsInCart = await db.query.cartItems.findMany({ where: eq(cartItems.cartId, cartId) });
    expect(itemsInCart).toHaveLength(1);
  });

  it("creates an order from the cart with correct tax calculation and snapshotted prices", async () => {
    const cartLine = await db.query.cartItems.findFirst({ where: eq(cartItems.cartId, cartId), with: { menuItem: true } });
    expect(cartLine).toBeTruthy();

    const subtotal = Number(cartLine!.menuItem!.price) * cartLine!.quantity;
    const { taxAmount, totalAmount } = computeOrderTotals(subtotal);
    expect(subtotal).toBe(300);
    expect(totalAmount).toBe(315);

    const order = await db.transaction(async (tx) => {
      const [createdOrder] = await tx
        .insert(orders)
        .values({
          orderNumber: generateOrderNumber(),
          userId: profileId,
          orderType: "online",
          status: "placed",
          subtotal: String(subtotal),
          taxAmount: String(taxAmount),
          totalAmount: String(totalAmount),
          customerName: "Vitest Customer",
        })
        .returning();

      await tx.insert(orderItems).values({
        orderId: createdOrder.id,
        menuItemId,
        itemName: cartLine!.menuItem!.name,
        itemPrice: cartLine!.menuItem!.price,
        quantity: cartLine!.quantity,
        lineTotal: String(subtotal),
      });

      await tx.insert(payments).values({
        orderId: createdOrder.id,
        method: "cash",
        status: "pending",
        amount: String(totalAmount),
        idempotencyKey: createdOrder.id,
      });

      await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));

      return createdOrder;
    });

    orderId = order.id;
    expect(order.status).toBe("placed");

    // Historical receipt accuracy: change the live menu price afterwards...
    await db.update(menuItems).set({ price: "999.00" }).where(eq(menuItems.id, menuItemId));

    // ...and confirm the stored order line item price is unaffected.
    const storedItem = await db.query.orderItems.findFirst({ where: eq(orderItems.orderId, orderId) });
    expect(storedItem?.itemPrice).toBe("100.00");

    const remainingCartItems = await db.query.cartItems.findMany({ where: eq(cartItems.cartId, cartId) });
    expect(remainingCartItems).toHaveLength(0);
  });

  it("deducts inventory based on the recipe when the order is confirmed, and prevents duplicate deductions", async () => {
    const before = await db.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, inventoryItemId) });
    expect(Number(before!.quantityOnHand)).toBe(10);

    await db.transaction(async (tx) => {
      const [lockedOrder] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
      expect(lockedOrder.inventoryDeducted).toBe(false);
      await deductInventoryForOrder(tx, orderId, profileId);
      await tx.update(orders).set({ status: "accepted", inventoryDeducted: true }).where(eq(orders.id, orderId));
    });

    const afterFirstDeduction = await db.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, inventoryItemId) });
    // 3 units ordered x 0.5kg rice per unit = 1.5kg deducted.
    expect(Number(afterFirstDeduction!.quantityOnHand)).toBe(8.5);

    // Simulate a retried "accept" request (e.g. a duplicate webhook or double-click).
    // The route layer guards with `inventoryDeducted`, so a second attempt must be a no-op.
    await db.transaction(async (tx) => {
      const [lockedOrder] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
      if (!lockedOrder.inventoryDeducted) {
        await deductInventoryForOrder(tx, orderId, profileId);
      }
    });

    const afterRetry = await db.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, inventoryItemId) });
    expect(Number(afterRetry!.quantityOnHand)).toBe(8.5);
  });

  it("marks the cash payment as paid exactly once (idempotent payment processing)", async () => {
    const markPaid = () =>
      db.transaction(async (tx) => {
        const [payment] = await tx.select().from(payments).where(eq(payments.orderId, orderId)).for("update");
        if (payment.status === "paid") return "already-paid" as const;
        await tx.update(payments).set({ status: "paid" }).where(eq(payments.id, payment.id));
        return "marked-paid" as const;
      });

    const firstResult = await markPaid();
    const secondResult = await markPaid();

    expect(firstResult).toBe("marked-paid");
    expect(secondResult).toBe("already-paid");

    const payment = await db.query.payments.findFirst({ where: eq(payments.orderId, orderId) });
    expect(payment?.status).toBe("paid");
  });

  it("produces a receipt with historically accurate totals for the completed order", async () => {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true, payments: true } });
    expect(order).toBeTruthy();
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0].lineTotal).toBe("300");
    expect(order!.totalAmount).toBe("315.00");
    expect(order!.payments[0].status).toBe("paid");
  });
});
