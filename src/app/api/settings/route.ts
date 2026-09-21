import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { canteenSettings } from "@/db/schema";
import { requireUser, apiErrorResponse } from "@/lib/rbac";

export async function GET() {
  const rows = await db.query.canteenSettings.findMany();
  const settings: Record<string, unknown> = {};
  for (const r of rows) settings[r.key] = r.value;
  return NextResponse.json({ settings });
}

const updateSchema = z.object({ key: z.string().min(1), value: z.unknown() });

export async function PATCH(req: Request) {
  try {
    await requireUser(["admin"]);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const existing = await db.query.canteenSettings.findFirst({ where: eq(canteenSettings.key, parsed.data.key) });
    if (existing) {
      await db.update(canteenSettings).set({ value: parsed.data.value, updatedAt: new Date() }).where(eq(canteenSettings.key, parsed.data.key));
    } else {
      await db.insert(canteenSettings).values({ key: parsed.data.key, value: parsed.data.value });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
