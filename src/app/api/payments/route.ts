import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

export async function GET() {
  try {
    await requireUser(["admin", "cashier"]);
    const rows = await db.query.payments.findMany({
      orderBy: [desc(payments.createdAt)],
      with: { order: true },
      limit: 100,
    });
    return NextResponse.json({ payments: rows });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
