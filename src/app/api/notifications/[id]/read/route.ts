import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const [row] = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
    return NextResponse.json({ notification: row });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
