import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protect /dashboard, /settings, /app routes — redirect to /login if no token cookie
export function middleware(req: NextRequest) {
  const token = req.cookies.get("bizstrives_token")?.value;
  const { pathname } = req.nextUrl;

  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/settings") || pathname.startsWith("/app");
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot") || pathname.startsWith("/reset");

  if (isProtected && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (isAuthPage && token && pathname !== "/reset-password") {
    // If already logged in, optional redirect to dashboard — allow viewing but hint
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/app/:path*", "/login", "/signup", "/forgot-password", "/reset-password"],
};
