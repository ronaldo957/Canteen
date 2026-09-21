import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const profile = await db.query.profiles.findFirst({ where: eq(profiles.email, email) });
    if (!profile) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (!profile.isActive) {
      return NextResponse.json({ error: "This account has been deactivated. Contact the canteen admin." }, { status: 403 });
    }

    const valid = await verifyPassword(password, profile.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

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
