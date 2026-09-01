import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({mocked:true, period:{id, year:2026, month:8, status:"Closed", openingBalance:"0.00", closingBalance:"350000.00"}});
  try{
    const p = await prisma.monthlyPeriod.findFirst({where:{id, businessId:auth.businessId!}, include:{statements:true}});
    if(!p) return NextResponse.json({error:"Not found"},{status:404});
    const txs = await prisma.transaction.findMany({where:{businessId:auth.businessId!, date:{gte:new Date(p.year, p.month-1,1), lte:new Date(p.year, p.month,0,23,59,59,999)}}});
    return NextResponse.json({period:p, transactions:txs});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const action=body.action;
  if(isMockDb()){
    if(action==="reopen") return NextResponse.json({ok:true, mocked:true, period:{id, status:"Open", reopenedAt:new Date().toISOString()}});
    if(action==="reclose") return NextResponse.json({ok:true, mocked:true, period:{id, status:"Closed", closedAt:new Date().toISOString()}});
    return NextResponse.json({error:"Unknown action"},{status:400});
  }
  try{
    const existing = await prisma.monthlyPeriod.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    if(action==="reopen"){
      if(existing.status!=="Closed") return NextResponse.json({error:"Not closed"},{status:400});
      const updated = await prisma.monthlyPeriod.update({where:{id}, data:{status:"Open", reopenedAt:new Date()}});
      await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"month.reopened", entity:"MonthlyPeriod", entityId:id, before:existing, after:updated});
      return NextResponse.json({ok:true, period:updated});
    }
    if(action==="reclose"){
      if(existing.status!=="Open") return NextResponse.json({error:"Not open"},{status:400});
      // Recalculate before reclose (caller should have fixed data)
      const updated = await prisma.monthlyPeriod.update({where:{id}, data:{status:"Closed", closedAt:new Date()}});
      await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"month.reclosed", entity:"MonthlyPeriod", entityId:id, before:existing, after:updated});
      return NextResponse.json({ok:true, period:updated});
    }
    return NextResponse.json({error:"Unknown action — use reopen or reclose"},{status:400});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
