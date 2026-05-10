import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token");

  // Routes publiques (pas d'auth requise)
  const PUBLIC_PATHS = [
    "/login",
    "/api/auth",
    "/marches",
    "/resultats",
    "/mission",
    "/gouvernance",
    "/rapports",
    "/contact",
  ];
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!isPublic && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si deja connecte et sur /login → rediriger vers dashboard
  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon|api/auth).*)"],
};
