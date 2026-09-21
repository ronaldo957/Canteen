import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(255).optional(),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(["customer", "admin", "kitchen", "cashier"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser(["admin"]);
    const { id } = await params;
    if (id === session.sub) {
      const body = await req.json();
      const parsed = updateSchema.safeParse(body);
      if (parsed.success && (parsed.data.isActive === false || (parsed.data.role && parsed.data.role !== "admin"))) {
        return NextResponse.json({ error: "You cannot deactivate or change your own admin role" }, { status: 400 });
      }
      const [row] = await db.update(profiles).set({ ...parsed.data, updatedAt: new Date() }).where(eq(profiles.id, id)).returning();
      return NextResponse.json({ user: row });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const [row] = await db.update(profiles).set({ ...parsed.data, updatedAt: new Date() }).where(eq(profiles.id, id)).returning();
    if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user: row });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
