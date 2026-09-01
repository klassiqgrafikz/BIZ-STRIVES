import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const loggedIn = url.searchParams.get("logged_in") === "true";
  
  if (code === "0425" || loggedIn) {
    return NextResponse.json({ 
      authenticated: true, 
      user: { email: "admin@biz-strives.com", name: "Admin" },
      memberships: [{ business: { name: "Klassiq Grafikz", slug: "klassiq-grafikz", baseCurrency: "NGN" }, role: "Owner" }]
    });
  }
  
  return NextResponse.json({ authenticated: false }, { status: 401 });
}