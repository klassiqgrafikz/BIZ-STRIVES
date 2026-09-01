import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()){
    return NextResponse.json({mocked:true, logs:[
      {id:"e1", recipient:"hello@klassiqgrafikz.com", type:"monthly_statement", subject:"Klassiq Grafikz — 2026-08 Statement", status:"Sent", sentAt:"2026-08-31T22:05:00Z", retryCount:0},
      {id:"e2", recipient:"owner@klassiqgrafikz.com", type:"invoice", subject:"Invoice INV-001", status:"Failed", errorMessage:"Resend mock fail", retryCount:2},
    ]});
  }
  try{
    const logs = await prisma.emailLog.findMany({where:{businessId:auth.businessId!}, orderBy:{createdAt:"desc"}, take:50});
    return NextResponse.json({logs});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
