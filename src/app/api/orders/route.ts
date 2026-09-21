import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cartItems, orderItems, orders, payments, profiles } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";
import { computeOrderTotals, generateOrderNumber } from "@/lib/utils";
import { getOrCreateCart } from "@/app/api/cart/route";

const walkInItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(50),
  specialInstructions: z.string().trim().max(300).optional().default(""),
});

const createOrderSchema = z.object({
  pickupTime: z.string().datetime().optional().nullable(),
  specialInstructions: z.string().trim().max(500).optional().default(""),
  paymentMethod: z.enum(["razorpay", "cash"]),
  customerName: z.string().trim().max(255).optional(),
  customerPhone: z.string().trim().max(20).optional(),
  items: z.array(walkInItemSchema).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [];
    if (session.role === "customer") {
      conditions.push(eq(orders.userId, session.sub));
    }
    if (status && status !== "all") {
      conditions.push(
        eq(
          orders.status,
          status as "placed" | "accepted" | "preparing" | "ready" | "completed" | "cancelled",
        ),
      );
    }
    if (search) conditions.push(ilike(orders.orderNumber, `%${search}%`));
    if (from) conditions.push(gte(orders.createdAt, new Date(from)));
    if (to) conditions.push(lte(orders.createdAt, new Date(to)));

    const rows = await db.query.orders.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(orders.createdAt)],
      with: { items: true, payments: true },
      limit: 200,
    });

    return NextResponse.json({ orders: rows });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const data = parsed.data;
    const isWalkIn = session.role === "cashier" || session.role === "admin";

    const lineItems: { menuItemId: string; name: string; price: number; quantity: number; specialInstructions: string }[] = [];

    if (isWalkIn && data.items && data.items.length > 0) {
      const ids = data.items.map((i) => i.menuItemId);
      const found = await db.query.menuItems.findMany({ where: (fields, { inArray }) => inArray(fields.id, ids) });
      const byId = new Map(found.map((m) => [m.id, m]));
      for (const it of data.items) {
        const m = byId.get(it.menuItemId);
        if (!m) return NextResponse.json({ error: "One of the items no longer exists" }, { status: 400 });
        if (!m.isAvailable) return NextResponse.json({ error: `${m.name} is currently unavailable` }, { status: 400 });
        lineItems.push({ menuItemId: m.id, name: m.name, price: Number(m.price), quantity: it.quantity, specialInstructions: it.specialInstructions ?? "" });
      }
    } else {
      const cart = await getOrCreateCart(session.sub);
      const items = await db.query.cartItems.findMany({ where: eq(cartItems.cartId, cart.id), with: { menuItem: true } });
      if (items.length === 0) {
        return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
      }
      for (const ci of items) {
        if (!ci.menuItem || !ci.menuItem.isAvailable) {
          return NextResponse.json({ error: `${ci.menuItem?.name ?? "An item"} is no longer available` }, { status: 400 });
        }
        lineItems.push({
          menuItemId: ci.menuItem.id,
          name: ci.menuItem.name,
          price: Number(ci.menuItem.price),
          quantity: ci.quantity,
          specialInstructions: ci.specialInstructions ?? "",
        });
      }
    }

    const subtotal = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const { taxAmount, totalAmount } = computeOrderTotals(subtotal);
    const maxPrepTime = 20;
    const estimatedReadyAt = new Date(Date.now() + maxPrepTime * 60 * 1000);

    let customerName = data.customerName;
    let customerPhone = data.customerPhone;
    if (!isWalkIn) {
      const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, session.sub) });
      customerName = profile?.fullName;
      customerPhone = profile?.phone ?? undefined;
    }

    const result = await db.transaction(async (tx) => {
      const orderNumber = generateOrderNumber();
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: isWalkIn ? null : session.sub,
          orderType: isWalkIn ? "walk_in" : "online",
          status: "placed",
          subtotal: String(subtotal),
          taxAmount: String(taxAmount),
          totalAmount: String(totalAmount),
          pickupTime: data.pickupTime ? new Date(data.pickupTime) : null,
          specialInstructions: data.specialInstructions,
          customerName,
          customerPhone,
          estimatedReadyAt,
          createdBy: session.sub,
        })
        .returning();

      await tx.insert(orderItems).values(
        lineItems.map((i) => ({
          orderId: order.id,
          menuItemId: i.menuItemId,
          itemName: i.name,
          itemPrice: String(i.price),
          quantity: i.quantity,
          lineTotal: String(i.price * i.quantity),
          specialInstructions: i.specialInstructions,
        })),
      );

      await tx.insert(payments).values({
        orderId: order.id,
        method: data.paymentMethod,
        status: "pending",
        amount: String(totalAmount),
        idempotencyKey: order.id,
      });

      if (!isWalkIn) {
        await tx.delete(cartItems).where(eq(cartItems.cartId, (await getOrCreateCart(session.sub)).id));
      }

      return order;
    });

    return NextResponse.json({ order: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
