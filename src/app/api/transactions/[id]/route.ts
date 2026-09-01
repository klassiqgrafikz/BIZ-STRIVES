import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  exchangeRate: z.number().positive().optional(),
  date: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  vendor: z.string().max(200).nullable().optional(),
  reference: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({transaction:{id, type:"INCOME", amount:"500000.00", currency:"NGN", date:"2026-09-01"}, mocked:true});
  try{
    const tx = await prisma.transaction.findFirst({where:{id, businessId:auth.businessId!}, include:{category:true, account:true, customer:true, project:true}});
    if(!tx) return NextResponse.json({error:"Not found"},{status:404});
    return NextResponse.json({transaction:tx});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body = await req.json().catch(()=>({})); const p = updateSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  if(isMockDb()) return NextResponse.json({ok:true, mocked:true});
  try{
    const existing = await prisma.transaction.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    // Check closed month lock — if MonthlyPeriod is Closed, block edits unless reopened
    const d = existing.date;
    const period = await prisma.monthlyPeriod.findUnique({where:{businessId_year_month:{businessId:auth.businessId!, year:d.getFullYear(), month:d.getMonth()+1}}});
    if(period?.status==="Closed") return NextResponse.json({error:"Month is closed — reopen before editing (Rule 7)"},{status:423});

    const data:Record<string,unknown>={};
    if(p.data.amount!==undefined) data.amount=p.data.amount;
    if(p.data.currency!==undefined) data.currency=p.data.currency.toUpperCase();
    if(p.data.exchangeRate!==undefined) data.exchangeRate=p.data.exchangeRate;
    if(p.data.amount!==undefined || p.data.exchangeRate!==undefined){
      const amt = p.data.amount ?? Number(existing.amount);
      const rate = p.data.exchangeRate ?? Number(existing.exchangeRate);
      data.baseAmount = Math.round(amt*rate*100)/100;
    }
    if(p.data.date!==undefined) data.date=new Date(p.data.date);
    if(p.data.categoryId!==undefined) data.categoryId=p.data.categoryId;
    if(p.data.accountId!==undefined) data.accountId=p.data.accountId;
    if(p.data.description!==undefined) data.description=p.data.description;
    if(p.data.vendor!==undefined) data.vendor=p.data.vendor;
    if(p.data.reference!==undefined) data.reference=p.data.reference;
    if(p.data.notes!==undefined) data.notes=p.data.notes;

    const updated = await prisma.transaction.update({where:{id}, data});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"transaction.updated", entity:"Transaction", entityId:id, before:existing, after:updated});
    return NextResponse.json({ok:true, transaction:updated});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({ok:true, mocked:true});
  try{
    const existing = await prisma.transaction.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    const period = await prisma.monthlyPeriod.findUnique({where:{businessId_year_month:{businessId:auth.businessId!, year:existing.date.getFullYear(), month:existing.date.getMonth()+1}}});
    if(period?.status==="Closed") return NextResponse.json({error:"Month closed — reopen first"},{status:423});
    await prisma.transaction.delete({where:{id}});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"transaction.deleted", entity:"Transaction", entityId:id, before:existing});
    return NextResponse.json({ok:true});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
