import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments, profiles } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    await requireUser(["admin", "cashier"]);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ? new Date(searchParams.get("from") as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = searchParams.get("to") ? new Date(searchParams.get("to") as string) : new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const completedCondition = and(gte(orders.createdAt, from), lte(orders.createdAt, to), ne(orders.status, "cancelled"));

    const [{ totalRevenue, totalOrders }] = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
        totalOrders: sql<number>`count(*)`,
      })
      .from(orders)
      .where(completedCondition);

    const [{ todayOrders }] = await db
      .select({ todayOrders: sql<number>`count(*)` })
      .from(orders)
      .where(gte(orders.createdAt, startOfToday));

    const [{ pendingOrders }] = await db
      .select({ pendingOrders: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.status} in ('placed','accepted','preparing','ready')`);

    const [{ completedOrders }] = await db
      .select({ completedOrders: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, "completed"));

    const [{ totalCustomers }] = await db
      .select({ totalCustomers: sql<number>`count(*)` })
      .from(profiles)
      .where(eq(profiles.role, "customer"));

    const dailySales = await db
      .select({
        day: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
        orderCount: sql<number>`count(*)`,
      })
      .from(orders)
      .where(completedCondition)
      .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`);

    const bestSellers = await db
      .select({
        name: orderItems.itemName,
        totalQuantity: sql<number>`sum(${orderItems.quantity})`,
        totalRevenue: sql<string>`sum(${orderItems.lineTotal})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(completedCondition)
      .groupBy(orderItems.itemName)
      .orderBy(sql`sum(${orderItems.quantity}) desc`)
      .limit(8);

    const paymentBreakdown = await db
      .select({
        method: payments.method,
        total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(payments)
      .where(eq(payments.status, "paid"))
      .groupBy(payments.method);

    const lowStock = await db.query.inventoryItems.findMany({
      where: (fields, { lte: lteOp }) => lteOp(fields.quantityOnHand, fields.minThreshold),
    });

    return NextResponse.json({
      totalRevenue: Number(totalRevenue),
      totalOrders: Number(totalOrders),
      todayOrders: Number(todayOrders),
      pendingOrders: Number(pendingOrders),
      completedOrders: Number(completedOrders),
      totalCustomers: Number(totalCustomers),
      lowStockCount: lowStock.length,
      lowStockItems: lowStock,
      dailySales: dailySales.map((d) => ({ day: d.day, revenue: Number(d.revenue), orderCount: Number(d.orderCount) })),
      bestSellers: bestSellers.map((b) => ({ name: b.name, totalQuantity: Number(b.totalQuantity), totalRevenue: Number(b.totalRevenue) })),
      paymentBreakdown: paymentBreakdown.map((p) => ({ method: p.method, total: Number(p.total), count: Number(p.count) })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
