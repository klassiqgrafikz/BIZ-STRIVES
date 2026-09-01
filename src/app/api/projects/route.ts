import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }
const mockProjects: Array<Record<string,unknown>> = [
  { id:"p1", businessId:"mock-biz", customerId:"c1", customerName:"John Doe", name:"Website Redesign", serviceType:"Website Development", description:"Corporate site", startDate:"2026-08-01", dueDate:"2026-09-15", agreedAmount:"500000.00", amountPaid:"450000.00", currency:"NGN", status:"Active" },
  { id:"p2", businessId:"mock-biz", customerId:"c2", customerName:"Ada Lovelace", name:"Brand Identity", serviceType:"Branding", description:"Logo + guidelines", startDate:"2026-08-15", dueDate:"2026-09-30", agreedAmount:"300000.00", amountPaid:"100000.00", currency:"NGN", status:"Draft" },
];

const createSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1).max(200),
  serviceType: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  agreedAmount: z.number().positive(),
  currency: z.string().length(3).default("NGN"),
  status: z.enum(["Draft","Active","Completed","Cancelled","OnHold"]).default("Draft"),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {searchParams}=new URL(req.url); const status=searchParams.get("status"); const q=searchParams.get("q")?.toLowerCase();
  if(isMockDb()){
    let f=[...mockProjects];
    if(status) f=f.filter(p=> p.status===status);
    if(q) f=f.filter(p=> String(p.name).toLowerCase().includes(q) || String(p.customerName).toLowerCase().includes(q));
    return NextResponse.json({mocked:true, projects:f, count:f.length});
  }
  try{
    const where:Record<string,unknown>={businessId:auth.businessId!};
    if(status) (where as Record<string,unknown>).status=status;
    if(q) (where as Record<string,unknown>).OR=[{name:{contains:q,mode:"insensitive"}},{serviceType:{contains:q,mode:"insensitive"}}];
    const projects = await prisma.project.findMany({where: where as never, include:{customer:true}, orderBy:{createdAt:"desc"}, take:100});
    return NextResponse.json({projects, count:projects.length});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function POST(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=createSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  if(isMockDb()){
    const proj={id:"mock-p-"+Date.now(), businessId:"mock-biz", ...p.data, agreedAmount:String(p.data.agreedAmount), amountPaid:"0.00", customerName:"Mock Customer"};
    mockProjects.unshift(proj);
    return NextResponse.json({ok:true, mocked:true, project:proj},{status:201});
  }
  try{
    const d=p.data;
    const customer = await prisma.customer.findFirst({where:{id:d.customerId, businessId:auth.businessId!}});
    if(!customer) return NextResponse.json({error:"Customer not found"},{status:404});
    const project = await prisma.project.create({
      data:{
        businessId:auth.businessId!,
        customerId:d.customerId,
        name:d.name.trim(),
        serviceType:d.serviceType||null,
        description:d.description||null,
        startDate:d.startDate? new Date(d.startDate): null,
        dueDate:d.dueDate? new Date(d.dueDate): null,
        agreedAmount:d.agreedAmount,
        amountPaid:0,
        currency:d.currency.toUpperCase(),
        status:d.status,
        notes:d.notes||null,
      }
    });
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"project.created", entity:"Project", entityId:project.id, after:project});
    return NextResponse.json({ok:true, project},{status:201});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
