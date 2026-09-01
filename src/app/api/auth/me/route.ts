import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // Check for logged_in cookie via query param or cookie
    const searchParams = url.searchParams;
    const loggedIn = searchParams.get("logged_in") === "true";
    
    // Also check cookie header
    const cookieHeader = req.headers.get("cookie") || "";
    const hasLoggedInCookie = cookieHeader.includes("logged_in=true") || cookieHeader.includes("logged_in");
    
    if (loggedIn || hasLoggedInCookie) {
      return NextResponse.json({ 
        authenticated: true, 
        user: { email: "admin@biz-strives.com", name: "Admin" },
        memberships: [{ business: { name: "Klassiq Grafikz", slug: "klassiq-grafikz", baseCurrency: "NGN" }, role: "Owner" }]
      });
    }
    
    // Also allow access if code is provided as query param
    const code = searchParams.get("code");
    if (code === "0425") {
      return NextResponse.json({ 
        authenticated: true, 
        user: { email: "admin@biz-strives.com", name: "Admin" },
        memberships: [{ business: { name: "Klassiq Grafikz", slug: "klassiq-grafikz", baseCurrency: "NGN" }, role: "Owner" }]
      });
    }
    
    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}