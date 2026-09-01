import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { hashPassword, signAccessToken } from "@/lib/auth/jwt";
import { auditLog } from "@/lib/audit";
import { COOKIE_NAME } from "@/lib/auth/session";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  businessName: z.string().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  // Hardcoded auth mode — signup disabled, return mock success
  const rl = rateLimit(`signup:0425:${getClientKey(req)}`, { limit: 3, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "Try again shortly" }, { status: 429 });
  
  try {
    return NextResponse.json({ 
      ok: true, 
      mocked: true, 
      message: "Signup disabled in hardcoded auth mode. Use /api/auth/login with code 0425.",
      user: { email: "admin@biz-strives.com", name: "Admin" }
    });
  } catch (e) {
    console.error("signup error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}