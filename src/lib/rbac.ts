import "server-only";
import { NextResponse } from "next/server";
import { getSession, type SessionRole } from "@/lib/session";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/** Require a logged-in user, optionally restricted to a set of roles. Throws on failure. */
export async function requireUser(allowedRoles?: SessionRole[]) {
  const session = await getSession();
  if (!session) throw new UnauthorizedError("Not authenticated");
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new ForbiddenError("Not authorized for this resource");
  }
  return session;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  console.error(error);
  return NextResponse.json({ error: message }, { status: 500 });
}
