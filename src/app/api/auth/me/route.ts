import { NextResponse } from "next/server";
import { verifyRequestAuth } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

export async function GET(req: Request) {
  const payload = verifyRequestAuth(req);
  if (!payload) return NextResponse.json({ authenticated:false }, { status:401 });

  try {
    const user = await prisma.user.findUnique({ where:{ id:payload.userId }, select:{ id:true, email:true, name:true, emailVerifiedAt:true, timezone:true, dateFormat:true }});
    if (!user) return NextResponse.json({ authenticated:false }, { status:401 });
    const memberships = await prisma.businessMember.findMany({ where:{ userId:user.id }, include:{ business:true }});
    return NextResponse.json({ authenticated:true, user, memberships });
  } catch (e) {
    if (String(e).includes("Can't reach") || String(e).includes("DATABASE_URL")) {
      return NextResponse.json({ authenticated:true, mocked:true, user:{ id:payload.userId, email:payload.email, name:"Mock User" }, memberships:[{ business:{ name:"Klassiq Grafikz", slug:"klassiq-grafikz", baseCurrency:"NGN" }, role:"Owner"}]});
    }
    return NextResponse.json({ error:"Internal" }, { status:500 });
  }
}
