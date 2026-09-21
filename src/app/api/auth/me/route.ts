import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, session.sub) });
  if (!profile || !profile.isActive) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      phone: profile.phone,
      avatarUrl: profile.avatarUrl,
    },
  });
}
