import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Check for hardcoded 0425 login cookie
  const cookieHeader = req.headers.get("cookie") || "";
  if (cookieHeader.includes("logged_in=true")) {
    return NextResponse.json({ authenticated: true, user: { email: "admin@biz-strives.com", name: "Admin" }, memberships: [{ business: { name: "Klassiq Grafikz", slug: "klassiq-grafikz", baseCurrency: "NGN" }, role: "Owner" }] });
  }
  
  // Fallback: check for logged_in cookie without =true
  if (cookieHeader.includes("logged_in")) {
    return NextResponse.json({ authenticated: true, user: { email: "admin@biz-strives.com", name: "Admin" }, memberships: [{ business: { name: "Klassiq Grafikz", slug: "klassiq-grafikz", baseCurrency: "NGN" }, role: "Owner" }] });
  }
  
  return NextResponse.json({ authenticated: false }, { status: 401 });
}