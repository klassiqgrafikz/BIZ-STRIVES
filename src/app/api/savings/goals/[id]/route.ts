import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";
import { calculateSavingsProgress } from "@/lib/finance/calculations";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().nullable().optional(),
  frequency: z.enum(["Daily","Weekly","Biweekly","Monthly","Custom"]).optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(["Active","Completed","Archived"]).optional(),
  allocate: z.object({
    amount: z.number().positive(),
    type: z.enum(["CONTRIBUTION","WITHDRAWAL"]),
    date: z.string().optional(),
    accountId: z.string().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  }).optional(),
});

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()){
    const allocations=[{id:"a1", goalId:id, amount:"50000.00", type:"CONTRIBUTION", date:"2026-09-01", notes:"Salary"}, {id:"a2", goalId:id, amount:"30000.00", type:"CONTRIBUTION", date:"2026-09-08", notes:"Weekly"}];
    const goal={id, name:"Emergency Fund", targetAmount:"500000.00", currentAmount:"120000.00", currency:"NGN", targetDate:"2026-12-31", frequency:"Monthly", status:"Active"};
    const {progressPct, remaining}=calculateSavingsProgress(Number(goal.currentAmount), Number(goal.targetAmount));
    return NextResponse.json({mocked:true, goal:{...goal, progressPct, remaining}, allocations});
  }
  try{
    const goal = await prisma.savingsGoal.findFirst({where:{id, businessId:auth.businessId!}});
    if(!goal) return NextResponse.json({error:"Not found"},{status:404});
    const allocations = await prisma.savingsAllocation.findMany({where:{goalId:id, businessId:auth.businessId!}, orderBy:{date:"desc"}, take:50, include:{account:true}});
    const {progressPct, remaining}=calculateSavingsProgress(Number(goal.currentAmount), Number(goal.targetAmount));
    return NextResponse.json({goal:{...goal, progressPct, remaining}, allocations});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=updateSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  if(isMockDb()){
    if(p.data.allocate) return NextResponse.json({ok:true, mocked:true, message:`Mock ${p.data.allocate.type} of ${p.data.allocate.amount} recorded`, progress: {current: "170000.00"}});
    return NextResponse.json({ok:true, mocked:true});
  }
  try{
    const existing = await prisma.savingsGoal.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});

    if(p.data.allocate){
      const alloc = p.data.allocate;
      const date = alloc.date? new Date(alloc.date): new Date();
      const delta = alloc.type==="CONTRIBUTION" ? alloc.amount : -alloc.amount;
      const newAmount = Math.round((Number(existing.currentAmount)+ delta)*100)/100;
      if(newAmount<0) return NextResponse.json({error:"Withdrawal exceeds current amount"},{status:400});
      const allocation = await prisma.savingsAllocation.create({
        data:{
          businessId: auth.businessId!,
          goalId: id,
          amount: alloc.amount,
          type: alloc.type,
          date,
          accountId: alloc.accountId||null,
          notes: alloc.notes||null,
        }
      });
      let status = existing.status;
      if(newAmount >= Number(existing.targetAmount)-0.01) status="Completed" as never;
      else if(status==="Completed" && newAmount < Number(existing.targetAmount)) status="Active" as never;
      const updated = await prisma.savingsGoal.update({where:{id}, data:{currentAmount: newAmount, status}});
      // Also create a transaction for audit (but excluded from Money Remaining per Rule 2 — handled via centralized engine)
      try{
        await prisma.transaction.create({
          data:{
            businessId: auth.businessId!,
            type: alloc.type==="CONTRIBUTION" ? "SAVINGS_ALLOCATION" : "SAVINGS_WITHDRAWAL",
            amount: alloc.amount,
            currency: existing.currency,
            exchangeRate:1,
            baseAmount: alloc.amount,
            date,
            description: `${alloc.type} — ${existing.name}`,
            notes: alloc.notes||null,
            accountId: alloc.accountId||null,
          }
        });
      }catch{}
      await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"savings.allocation", entity:"SavingsAllocation", entityId:allocation.id, after:allocation});
      const {progressPct, remaining}=calculateSavingsProgress(newAmount, Number(existing.targetAmount));
      return NextResponse.json({ok:true, allocation, goal: {...updated, progressPct, remaining}});
    }

    const data:Record<string,unknown>={};
    if(p.data.name!==undefined) data.name=p.data.name.trim();
    if(p.data.targetAmount!==undefined) data.targetAmount=p.data.targetAmount;
    if(p.data.targetDate!==undefined) data.targetDate=p.data.targetDate? new Date(p.data.targetDate): null;
    if(p.data.frequency!==undefined) data.frequency=p.data.frequency;
    if(p.data.notes!==undefined) data.notes=p.data.notes;
    if(p.data.status!==undefined) data.status=p.data.status;
    const updated = await prisma.savingsGoal.update({where:{id}, data});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"savingsGoal.updated", entity:"SavingsGoal", entityId:id, before:existing, after:updated});
    return NextResponse.json({ok:true, goal:updated});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({ok:true, mocked:true});
  try{
    const existing = await prisma.savingsGoal.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    const hasAlloc = await prisma.savingsAllocation.findFirst({where:{goalId:id}});
    if(hasAlloc) return NextResponse.json({error:"Goal has allocations — archive instead"},{status:400});
    await prisma.savingsGoal.delete({where:{id}});
    return NextResponse.json({ok:true});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
