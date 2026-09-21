import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";
import { z } from "zod";

export async function GET() {
  const rows = await db.query.categories.findMany({
    where: eq(categories.isActive, true),
    orderBy: [asc(categories.sortOrder)],
  });
  return NextResponse.json({ categories: rows });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(""),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  sortOrder: z.number().int().optional().default(0),
});

export async function POST(req: Request) {
  try {
    await requireUser(["admin"]);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const [row] = await db.insert(categories).values(parsed.data).returning();
    return NextResponse.json({ category: row }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
