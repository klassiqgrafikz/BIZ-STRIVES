import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

const mockLogs = [
  {id:"a1", businessId:"mock-biz", userId:"mock-user", action:"user.login", entity:"User", entityId:"mock-user", createdAt:new Date(Date.now()-3600000).toISOString(), after:{email:"owner@klassiqgrafikz.com"}},
  {id:"a2", businessId:"mock-biz", userId:"mock-user", action:"transaction.created", entity:"Transaction", entityId:"m1", createdAt:new Date(Date.now()-3000000).toISOString(), after:{type:"INCOME", amount:500000}},
  {id:"a3", businessId:"mock-biz", userId:"mock-user", action:"invoice.created", entity:"Invoice", entityId:"inv1", createdAt:new Date(Date.now()-2000000).toISOString()},
  {id:"a4", businessId:"mock-biz", userId:"mock-user", action:"month.closed", entity:"MonthlyPeriod", entityId:"mp-aug2026", createdAt:"2026-08-31T22:00:00Z"},
  {id:"a5", businessId:"mock-biz", userId:"mock-user", action:"month.reopened", entity:"MonthlyPeriod", entityId:"mp-aug2026", createdAt:"2026-09-01T08:00:00Z"},
  {id:"a6", businessId:"mock-biz", userId:"mock-user", action:"automation.created", entity:"Automation", entityId:"auto1", createdAt:new Date(Date.now()-1000000).toISOString()},
  {id:"a7", businessId:"mock-biz", userId:"mock-user", action:"statement.generated", entity:"Statement", entityId:"s1", createdAt:"2026-08-31T22:00:12Z"},
];

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  // Only Owner/Admin can view audit logs
  if(isMockDb()){
    const {searchParams}=new URL(req.url);
    const entity=searchParams.get("entity");
    const action=searchParams.get("action");
    let filtered=[...mockLogs];
    if(entity) filtered = filtered.filter(l=> l.entity===entity);
    if(action) filtered = filtered.filter(l=> String(l.action).includes(action));
    return NextResponse.json({mocked:true, logs: filtered, count: filtered.length, protected:"Requires Owner/Admin — mock shows all"});
  }
  try{
    const member = await prisma.businessMember.findFirst({where:{userId:auth.userId, businessId:auth.businessId!}});
    if(!member || !["Owner","Admin","Accountant"].includes(member.role)) return NextResponse.json({error:"Forbidden — Owner/Admin/Accountant only"},{status:403});
    const {searchParams}=new URL(req.url);
    const entity=searchParams.get("entity");
    const take = Math.min(100, Number(searchParams.get("take")||"50"));
    const where:Record<string,unknown>={businessId:auth.businessId!};
    if(entity) (where as Record<string,unknown>).entity=entity;
    const logs = await prisma.auditLog.findMany({where: where as never, orderBy:{createdAt:"desc"}, take});
    return NextResponse.json({logs, count: logs.length});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
