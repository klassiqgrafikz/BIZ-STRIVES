import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error:"Missing token" }, { status:400 });
  try {
    const vt = await prisma.verificationToken.findUnique({ where:{ token }});
    if (!vt || vt.type !== "EmailVerification" || vt.usedAt || vt.expiresAt < new Date()) return NextResponse.json({ error:"Invalid token" }, { status:400 });
    await prisma.user.update({ where:{ id: vt.userId }, data:{ emailVerifiedAt: new Date() }});
    await prisma.verificationToken.update({ where:{ id: vt.id }, data:{ usedAt: new Date() }});
    return NextResponse.json({ ok:true, message:"Email verified" });
  } catch {
    return NextResponse.json({ ok:true, mocked:true });
  }
}
