import { NextRequest, NextResponse } from "next/server";
import { and, gte, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

function toCsvValue(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(["admin", "cashier"]);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ? new Date(searchParams.get("from") as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = searchParams.get("to") ? new Date(searchParams.get("to") as string) : new Date();

    const rows = await db.query.orders.findMany({
      where: and(gte(orders.createdAt, from), lte(orders.createdAt, to), ne(orders.status, "cancelled")),
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
      with: { payments: true },
    });

    const header = ["Order Number", "Date", "Type", "Status", "Subtotal", "Tax", "Total", "Payment Method", "Payment Status", "Customer"];
    const lines = [header.join(",")];
    for (const o of rows) {
      const payment = o.payments[0];
      lines.push(
        [
          o.orderNumber,
          new Date(o.createdAt).toISOString(),
          o.orderType,
          o.status,
          o.subtotal,
          o.taxAmount,
          o.totalAmount,
          payment?.method ?? "",
          payment?.status ?? "",
          o.customerName ?? "",
        ]
          .map(toCsvValue)
          .join(","),
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sales-report-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
