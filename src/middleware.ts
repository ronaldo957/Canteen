import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "sc_session";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  kitchen: "/kitchen",
  cashier: "/cashier",
  customer: "/menu",
};

const PROTECTED_PREFIXES: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/kitchen", roles: ["kitchen", "admin"] },
  { prefix: "/cashier", roles: ["cashier", "admin"] },
  { prefix: "/account", roles: ["customer", "admin", "kitchen", "cashier"] },
  { prefix: "/checkout", roles: ["customer", "admin", "kitchen", "cashier"] },
];

async function getRole(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const match = PROTECTED_PREFIXES.find((p) => pathname.startsWith(p.prefix));
  if (!match) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const role = await getRole(token);

  if (!role) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!match.roles.includes(role)) {
    const home = ROLE_HOME[role] ?? "/";
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*", "/cashier/:path*", "/account/:path*", "/checkout/:path*"],
};
