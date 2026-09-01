import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  schedule: z.string().max(100).nullable().optional(),
  conditions: z.record(z.string(), z.unknown()).nullable().optional(),
  actionType: z.enum(["GenerateStatement","EmailStatement","SendBirthdayMessage","NotifyUser","Custom"]).optional(),
  triggerType: z.enum(["MonthEnds","StatementGenerated","CustomerBirthday","PaymentDetected","SavingsDateArrives","Custom"]).optional(),
  runNow: z.boolean().optional(), // trigger manual run
});

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=updateSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  if(isMockDb()){
    if(p.data.runNow) return NextResponse.json({ok:true, mocked:true, log:{started:new Date().toISOString(), completed:new Date(Date.now()+2000).toISOString(), status:"Completed", message:`Mock run of ${id}`}});
    return NextResponse.json({ok:true, mocked:true});
  }
  try{
    const existing = await prisma.automation.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    if(p.data.runNow){
      // Simulate run: update lastRun
      const updated = await prisma.automation.update({where:{id}, data:{lastRun:new Date(), errorState:null}});
      await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"automation.run", entity:"Automation", entityId:id, after:updated});
      return NextResponse.json({ok:true, automation:updated, message:"Run queued — background worker in production (BullMQ)"});
    }
    const data:Record<string,unknown>={};
    if(p.data.name!==undefined) data.name=p.data.name.trim();
    if(p.data.enabled!==undefined) data.enabled=p.data.enabled;
    if(p.data.schedule!==undefined) data.schedule=p.data.schedule;
    if(p.data.conditions!==undefined) data.conditions=p.data.conditions as unknown;
    if(p.data.actionType!==undefined) data.actionType=p.data.actionType;
    if(p.data.triggerType!==undefined) data.triggerType=p.data.triggerType;
    const updated = await prisma.automation.update({where:{id}, data});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"automation.updated", entity:"Automation", entityId:id, before:existing, after:updated});
    return NextResponse.json({ok:true, automation:updated});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({ok:true, mocked:true});
  try{
    const existing = await prisma.automation.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    await prisma.automation.delete({where:{id}});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"automation.deleted", entity:"Automation", entityId:id, before:existing});
    return NextResponse.json({ok:true});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
