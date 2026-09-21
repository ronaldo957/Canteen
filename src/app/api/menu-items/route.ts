import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { menuItems, categories } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const category = searchParams.get("category")?.trim();
  const veg = searchParams.get("veg");
  const sort = searchParams.get("sort");
  const includeUnavailable = searchParams.get("all") === "true";

  const conditions = [];
  if (!includeUnavailable) conditions.push(eq(menuItems.isAvailable, true));
  if (category && category !== "all") conditions.push(eq(menuItems.categoryId, category));
  if (veg === "veg") conditions.push(eq(menuItems.isVeg, true));
  if (veg === "nonveg") conditions.push(eq(menuItems.isVeg, false));
  if (search) conditions.push(ilike(menuItems.name, `%${search}%`));

  let orderBy = [desc(menuItems.isFeatured), asc(menuItems.name)];
  if (sort === "price_asc") orderBy = [asc(menuItems.price)];
  if (sort === "price_desc") orderBy = [desc(menuItems.price)];
  if (sort === "rating") orderBy = [desc(menuItems.rating)];

  const rows = await db.query.menuItems.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy,
    with: { category: true },
  });

  return NextResponse.json({ items: rows });
}

const createSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).optional().default(""),
  price: z.coerce.number().positive(),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  isVeg: z.boolean().optional().default(true),
  isAvailable: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  isSpecialToday: z.boolean().optional().default(false),
  prepTimeMinutes: z.coerce.number().int().positive().optional().default(15),
  calories: z.coerce.number().int().positive().optional(),
});

export async function POST(req: Request) {
  try {
    await requireUser(["admin"]);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const category = await db.query.categories.findFirst({ where: eq(categories.id, parsed.data.categoryId) });
    if (!category) return NextResponse.json({ error: "Invalid category" }, { status: 400 });

    const [row] = await db
      .insert(menuItems)
      .values({ ...parsed.data, price: String(parsed.data.price) })
      .returning();
    return NextResponse.json({ item: row }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
