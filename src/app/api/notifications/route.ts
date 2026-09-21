import { NextResponse } from "next/server";
import { desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await requireUser();
    const isStaff = ["admin", "kitchen", "cashier"].includes(session.role);
    const rows = await db.query.notifications.findMany({
      where: isStaff ? or(eq(notifications.userId, session.sub), isNull(notifications.userId)) : eq(notifications.userId, session.sub),
      orderBy: [desc(notifications.createdAt)],
      limit: 30,
    });
    return NextResponse.json({ notifications: rows });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
