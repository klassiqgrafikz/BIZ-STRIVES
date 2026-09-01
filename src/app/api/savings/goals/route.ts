import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";
import { calculateSavingsProgress } from "@/lib/finance/calculations";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

const mockGoals: Array<Record<string,unknown>> = [
  { id:"g1", businessId:"mock-biz", name:"Emergency Fund", targetAmount:"500000.00", currentAmount:"120000.00", currency:"NGN", targetDate:"2026-12-31", frequency:"Monthly", status:"Active", notes:"6 months runway" },
  { id:"g2", businessId:"mock-biz", name:"New Laptop", targetAmount:"800000.00", currentAmount:"250000.00", currency:"NGN", targetDate:"2026-11-01", frequency:"Weekly", status:"Active", notes:"MacBook Pro" },
  { id:"g3", businessId:"mock-biz", name:"Tax Reserve", targetAmount:"1000000.00", currentAmount:"600000.00", currency:"NGN", targetDate:"2027-03-31", frequency:"Monthly", status:"Active", notes:"FY 2026" },
];

const createSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  currency: z.string().length(3).default("NGN"),
  targetDate: z.string().optional().nullable(),
  frequency: z.enum(["Daily","Weekly","Biweekly","Monthly","Custom"]).default("Monthly"),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()){
    const enriched = mockGoals.map(g=>{
      const { progressPct, remaining } = calculateSavingsProgress(Number(g.currentAmount as string), Number(g.targetAmount as string));
      return {...g, progressPct, remaining, allocCount: 3};
    });
    const totalReserved = enriched.reduce((s,g)=> s+Number((g as Record<string,unknown>).currentAmount as string),0);
    return NextResponse.json({mocked:true, goals: enriched, totalReserved, count: enriched.length});
  }
  try{
    const goals = await prisma.savingsGoal.findMany({where:{businessId:auth.businessId!}, orderBy:{createdAt:"desc"}, include:{allocations:{take:5, orderBy:{date:"desc"}}}});
    const enriched = goals.map(g=>{
      const {progressPct, remaining} = calculateSavingsProgress(Number(g.currentAmount), Number(g.targetAmount));
      return {...g, progressPct, remaining};
    });
    const totalReserved = goals.reduce((s,g)=> s+Number(g.currentAmount),0);
    return NextResponse.json({goals: enriched, totalReserved, count: goals.length});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function POST(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=createSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  if(isMockDb()){
    const g={id:"mock-g-"+Date.now(), businessId:"mock-biz", name:p.data.name.trim(), targetAmount:String(p.data.targetAmount), currentAmount:"0.00", currency:p.data.currency.toUpperCase(), targetDate: p.data.targetDate||null, frequency:p.data.frequency, status:"Active", notes:p.data.notes||null};
    mockGoals.unshift(g);
    return NextResponse.json({ok:true, mocked:true, goal:g},{status:201});
  }
  try{
    const d=p.data;
    const goal = await prisma.savingsGoal.create({
      data:{
        businessId: auth.businessId!,
        name: d.name.trim(),
        targetAmount: d.targetAmount,
        currentAmount: 0,
        currency: d.currency.toUpperCase(),
        targetDate: d.targetDate? new Date(d.targetDate): null,
        frequency: d.frequency,
        notes: d.notes||null,
      }
    });
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"savingsGoal.created", entity:"SavingsGoal", entityId:goal.id, after:goal});
    return NextResponse.json({ok:true, goal},{status:201});
  }catch(e:unknown){
    const msg=e instanceof Error? e.message:String(e);
    if(msg.includes("Unique")) return NextResponse.json({error:"Goal name already exists"},{status:409});
    console.error(e); return NextResponse.json({error:"Internal"},{status:500});
  }
}
