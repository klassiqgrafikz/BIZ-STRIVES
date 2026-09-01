import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { signAccessToken } from "@/lib/auth/jwt";
import { auditLog } from "@/lib/audit";
import { COOKIE_NAME } from "@/lib/auth/session";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const rl = rateLimit(`login:0425:${getClientKey(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now())/1000)) } });
  try {
    const body = await req.json().catch(()=> ({}));
    const code = (body?.code || "").toString().trim();
    
    // Hardcoded 4-digit code authentication
    if (code !== "0425") {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }
    
    const token = signAccessToken({ 
      userId: "hardcoded-0425", 
      email: "admin@biz-strives.com", 
      businessId: "hardcoded-0425", 
      role: "Owner" 
    });
    
    const res = NextResponse.json({ ok: true, user: { email: "admin@biz-strives.com", name: "Admin" } });
    res.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}