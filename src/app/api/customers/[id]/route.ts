import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }
const updateSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().max(30).optional().nullable(),
  company: z.string().max(100).optional().nullable(),
  birthday: z.string().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()){
    return NextResponse.json({
      mocked:true,
      customer:{ id, fullName:"John Doe", email:"john@example.com", phone:"+2348012345678", company:"Doe Enterprises", birthday:"1990-05-15", address:"Lagos", notes:"VIP" },
      stats:{ totalReceived: 500000, projectCount:2, invoiceCount:1, outstanding: 50000, payments: [{date:"2026-09-01", amount:500000, project:"Website Redesign"}] },
      projects:[{id:"p1", name:"Website Redesign", status:"Active", agreedAmount:500000, amountPaid:450000}],
      invoices:[{id:"inv1", invoiceNumber:"INV-001", total:500000, amountPaid:450000, balanceDue:50000, status:"PartiallyPaid"}]
    });
  }
  try{
    const customer = await prisma.customer.findFirst({where:{id, businessId:auth.businessId!}});
    if(!customer) return NextResponse.json({error:"Not found"},{status:404});
    const [projects, invoices, transactions] = await Promise.all([
      prisma.project.findMany({where:{customerId:id, businessId:auth.businessId!}}),
      prisma.invoice.findMany({where:{customerId:id, businessId:auth.businessId!}}),
      prisma.transaction.findMany({where:{customerId:id, businessId:auth.businessId!, type:"INCOME"}}),
    ]);
    const totalReceived = transactions.reduce((s,t)=> s+Number(t.amount),0);
    const outstanding = invoices.reduce((s,inv)=> s+Number(inv.balanceDue),0);
    return NextResponse.json({ customer, stats:{ totalReceived, projectCount:projects.length, invoiceCount:invoices.length, outstanding, payments: transactions.slice(0,10) }, projects, invoices });
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body = await req.json().catch(()=>({})); const p=updateSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  if(isMockDb()) return NextResponse.json({ok:true, mocked:true});
  try{
    const existing = await prisma.customer.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    const data:Record<string,unknown>={};
    if(p.data.fullName!==undefined) data.fullName=p.data.fullName.trim();
    if(p.data.email!==undefined) data.email=p.data.email||null;
    if(p.data.phone!==undefined) data.phone=p.data.phone||null;
    if(p.data.company!==undefined) data.company=p.data.company||null;
    if(p.data.birthday!==undefined) data.birthday=p.data.birthday? new Date(p.data.birthday): null;
    if(p.data.address!==undefined) data.address=p.data.address||null;
    if(p.data.notes!==undefined) data.notes=p.data.notes||null;
    const updated = await prisma.customer.update({where:{id}, data});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"customer.updated", entity:"Customer", entityId:id, before:existing, after:updated});
    return NextResponse.json({ok:true, customer:updated});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({ok:true, mocked:true});
  try{
    const existing = await prisma.customer.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    const hasProjects = await prisma.project.findFirst({where:{customerId:id}});
    if(hasProjects) return NextResponse.json({error:"Cannot delete customer with projects — archive instead"}, {status:400});
    await prisma.customer.delete({where:{id}});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"customer.deleted", entity:"Customer", entityId:id, before:existing});
    return NextResponse.json({ok:true});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
