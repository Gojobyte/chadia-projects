import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token");

  // Routes publiques (pas d'auth requise). La home `/` est la page Notre
  // mission, ouverte à tous.
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
  const isPublicHome = pathname === "/";
  const isPublic = isPublicHome || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!isPublic && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si déjà connecté et sur /login → rediriger vers le dashboard.
  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Si déjà connecté et sur la home publique → rediriger vers le dashboard.
  // Le visiteur non connecté continue à voir la page Notre mission à `/`.
  if (isPublicHome && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon|api/auth).*)"],
};
