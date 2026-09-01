import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({}));
    const code = (body?.code || "").toString().trim();
    
    // Hardcoded 4-digit code check
    if (code !== "0425") {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }
    
    // Set a simple cookie without JWT signing
    const res = NextResponse.json({ ok: true, user: { email: "admin@biz-strives.com", name: "Admin" } });
    res.cookies.set("logged_in", "true", { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}