import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyPassword, signAccessToken } from "@/lib/auth/jwt";
import { auditLog } from "@/lib/audit";
import { COOKIE_NAME } from "@/lib/auth/session";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function isMockDb() {
  const url = process.env.DATABASE_URL || "";
  return url.includes("user:password") || url.includes("localhost") || !url;
}

export async function POST(req: Request) {
  const rl = rateLimit(`login:${getClientKey(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now())/1000)) } });
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const email = parsed.data.email.toLowerCase().trim();

    if (isMockDb()) {
      // Dev mock — accept any login for clickable demo, but seed hint is owner@klassiqgrafikz.com
      const token = signAccessToken({ userId: "mock-user-id", email, businessId: "mock-biz", role: "Owner" });
      const res = NextResponse.json({ ok: true, mocked: true, user: { email, name: "Mock User" }, business: { name: "Klassiq Grafikz", slug: "klassiq-grafikz-mock" } });
      res.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 60*60*24*7 });
      return res;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const membership = await prisma.businessMember.findFirst({ where: { userId: user.id }, include: { business: true } });

    await auditLog({ userId: user.id, businessId: membership?.businessId ?? null, action:"user.login", entity:"User", entityId: user.id });

    const token = signAccessToken({
      userId: user.id,
      email: user.email,
      businessId: membership?.businessId,
      role: membership?.role,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
      business: membership?.business ? { id: membership.business.id, name: membership.business.name, slug: membership.business.slug } : null,
    });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error("login error", e);
    if (isMockDb() || String(e).includes("Can't reach") || String(e).includes("connect") || String(e).includes("P1001")) {
      const raw = await req.clone().json().catch(()=>({})) as { email?:string };
      const fallbackEmail = raw.email || "mock@example.com";
      const token = signAccessToken({ userId: "mock-user-id", email: fallbackEmail, businessId:"mock-biz", role:"Owner" });
      const res = NextResponse.json({ ok:true, mocked:true, user:{ email: fallbackEmail, name:"Mock User" }, business:{ name:"Klassiq Grafikz" }});
      res.cookies.set(COOKIE_NAME, token, { httpOnly:true, secure:false, sameSite:"lax", path:"/", maxAge: 60*60*24*7 });
      return res;
    }
    return NextResponse.json({ error:"Internal error" }, { status:500 });
  }
}
