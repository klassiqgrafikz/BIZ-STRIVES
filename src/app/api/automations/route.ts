import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

const mockAutomations: Array<Record<string,unknown>> = [
  {id:"auto1", businessId:"mock-biz", name:"Month-end → Generate statement", triggerType:"MonthEnds", conditions:{time:"22:00", timezone:"Africa/Lagos"}, actionType:"GenerateStatement", schedule:"0 22 L * *", enabled:true, lastRun:"2026-08-31T22:00:00Z", nextRun:"2026-09-30T22:00:00Z", errorState:null},
  {id:"auto2", businessId:"mock-biz", name:"Statement → Email", triggerType:"StatementGenerated", conditions:null, actionType:"EmailStatement", schedule:null, enabled:true, lastRun:"2026-08-31T22:05:00Z", nextRun:null, errorState:null},
  {id:"auto3", businessId:"mock-biz", name:"Birthday greeting", triggerType:"CustomerBirthday", conditions:{channel:"Email"}, actionType:"SendBirthdayMessage", schedule:"0 7 * * *", enabled:true, lastRun:"2026-09-01T07:00:00Z", nextRun:"2026-09-02T07:00:00Z", errorState:null},
  {id:"auto4", businessId:"mock-biz", name:"Payment detected → Notify", triggerType:"PaymentDetected", conditions:null, actionType:"NotifyUser", schedule:null, enabled:false, lastRun:null, nextRun:null, errorState:"Disabled for V1"},
];

const createSchema = z.object({
  name: z.string().min(1).max(100),
  triggerType: z.enum(["MonthEnds","StatementGenerated","CustomerBirthday","PaymentDetected","SavingsDateArrives","Custom"]),
  conditions: z.record(z.string(), z.unknown()).optional().nullable(),
  actionType: z.enum(["GenerateStatement","EmailStatement","SendBirthdayMessage","NotifyUser","Custom"]),
  schedule: z.string().max(100).optional().nullable(), // cron
  enabled: z.boolean().default(true),
});

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({mocked:true, automations: mockAutomations, count: mockAutomations.length, logs:[
    {automationId:"auto1", started:"2026-08-31T22:00:00Z", completed:"2026-08-31T22:00:12Z", status:"Completed"},
    {automationId:"auto2", started:"2026-08-31T22:05:00Z", completed:"2026-08-31T22:05:03Z", status:"Completed"},
    {automationId:"auto3", started:"2026-09-01T07:00:00Z", completed:null, status:"Failed", error:"No birthdays today"},
  ]});

  try{
    const autos = await prisma.automation.findMany({where:{businessId:auth.businessId!}, orderBy:{createdAt:"desc"}});
    return NextResponse.json({automations: autos, count: autos.length});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function POST(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=createSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  if(isMockDb()){
    const a={id:"mock-auto-"+Date.now(), businessId:"mock-biz", ...p.data, lastRun:null, nextRun:p.data.schedule? new Date(Date.now()+86400000).toISOString(): null, errorState:null};
    mockAutomations.unshift(a as never);
    return NextResponse.json({ok:true, mocked:true, automation:a},{status:201});
  }
  try{
    const d=p.data;
    const auto = await prisma.automation.create({
      data:{
        businessId: auth.businessId!,
        name: d.name.trim(),
        triggerType: d.triggerType as never,
        conditions: (d.conditions as never) || undefined,
        actionType: d.actionType as never,
        schedule: d.schedule||null,
        enabled: d.enabled,
        nextRun: d.schedule? new Date(Date.now()+86400000): null, // simplified nextRun calc
      }
    });
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"automation.created", entity:"Automation", entityId:auto.id, after:auto});
    return NextResponse.json({ok:true, automation:auto},{status:201});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
