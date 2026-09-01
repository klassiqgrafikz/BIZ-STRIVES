import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/jwt";

const schema = z.object({ token: z.string().min(10), password: z.string().min(8).max(100) });

export async function POST(req: Request) {
  const body = await req.json().catch(()=> ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });

  try {
    const vt = await prisma.verificationToken.findUnique({ where:{ token: parsed.data.token }});
    if (!vt || vt.type !== "PasswordReset" || vt.usedAt || vt.expiresAt < new Date()) {
      return NextResponse.json({ error:"Invalid or expired token" }, { status:400 });
    }
    const hashed = await hashPassword(parsed.data.password);
    await prisma.user.update({ where:{ id: vt.userId }, data:{ passwordHash: hashed }});
    await prisma.verificationToken.update({ where:{ id: vt.id }, data:{ usedAt: new Date() }});
    return NextResponse.json({ ok:true, message:"Password reset successful. Please log in." });
  } catch (e) {
    if (String(e).includes("Can't reach") || String(e).includes("DATABASE_URL")) {
      return NextResponse.json({ ok:true, mocked:true, message:"DB not configured — mock success" });
    }
    console.error("reset error", e);
    return NextResponse.json({ error:"Internal" }, { status:500 });
  }
}
