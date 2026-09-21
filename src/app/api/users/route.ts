import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { carts, profiles } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";
import { hashPassword } from "@/lib/password";

export async function GET() {
  try {
    await requireUser(["admin"]);
    const rows = await db.query.profiles.findMany({
      orderBy: [desc(profiles.createdAt)],
      columns: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ users: rows });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(["customer", "admin", "kitchen", "cashier"]),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    await requireUser(["admin"]);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const existing = await db.query.profiles.findFirst({ where: (fields, { eq }) => eq(fields.email, parsed.data.email) });
    if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

    const passwordHash = await hashPassword(parsed.data.password);
    const [row] = await db
      .insert(profiles)
      .values({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        role: parsed.data.role,
        passwordHash,
      })
      .returning();

    if (row.role === "customer") {
      await db.insert(carts).values({ userId: row.id });
    }

    return NextResponse.json({ user: { id: row.id, fullName: row.fullName, email: row.email, role: row.role } }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
