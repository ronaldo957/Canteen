import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, carts } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/session";

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is too short").max(255),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(20).optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { fullName, email, phone, password } = parsed.data;

    const existing = await db.query.profiles.findFirst({ where: eq(profiles.email, email) });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const [profile] = await db
      .insert(profiles)
      .values({
        fullName,
        email,
        phone: phone || null,
        passwordHash,
        role: "customer",
      })
      .returning();

    await db.insert(carts).values({ userId: profile.id });

    const token = await createSessionToken({
      sub: profile.id,
      email: profile.email,
      role: profile.role,
      fullName: profile.fullName,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: profile.id, email: profile.email, fullName: profile.fullName, role: profile.role },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
