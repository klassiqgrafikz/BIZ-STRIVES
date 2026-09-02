import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    authenticated: true, 
    user: { email: "admin@biz-strives.com", name: "Admin" },
    memberships: [{ business: { name: "Klassiq Grafikz", slug: "klassiq-grafikz", baseCurrency: "NGN" }, role: "Owner" }]
  });
}