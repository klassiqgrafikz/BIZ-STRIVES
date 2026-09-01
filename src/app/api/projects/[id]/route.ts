import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }
const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  serviceType: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  agreedAmount: z.number().positive().optional(),
  amountPaid: z.number().min(0).optional(),
  status: z.enum(["Draft","Active","Completed","Cancelled","OnHold"]).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({mocked:true, project:{id, name:"Website Redesign", customerName:"John Doe", agreedAmount:"500000.00", amountPaid:"450000.00", outstanding:"50000.00", status:"Active"}, payments:[{date:"2026-09-01", amount:300000},{date:"2026-09-10", amount:150000}]});
  try{
    const proj = await prisma.project.findFirst({where:{id, businessId:auth.businessId!}, include:{customer:true, invoices:true, transactions:true}});
    if(!proj) return NextResponse.json({error:"Not found"},{status:404});
    const outstanding = Number(proj.agreedAmount) - Number(proj.amountPaid);
    return NextResponse.json({project:proj, outstanding, payments: proj.transactions});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=updateSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  if(isMockDb()) return NextResponse.json({ok:true, mocked:true});
  try{
    const existing = await prisma.project.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    const data:Record<string,unknown>={};
    if(p.data.name!==undefined) data.name=p.data.name.trim();
    if(p.data.serviceType!==undefined) data.serviceType=p.data.serviceType;
    if(p.data.description!==undefined) data.description=p.data.description;
    if(p.data.startDate!==undefined) data.startDate=p.data.startDate? new Date(p.data.startDate): null;
    if(p.data.dueDate!==undefined) data.dueDate=p.data.dueDate? new Date(p.data.dueDate): null;
    if(p.data.agreedAmount!==undefined) data.agreedAmount=p.data.agreedAmount;
    if(p.data.amountPaid!==undefined) data.amountPaid=p.data.amountPaid;
    if(p.data.status!==undefined) data.status=p.data.status;
    if(p.data.notes!==undefined) data.notes=p.data.notes;
    const updated = await prisma.project.update({where:{id}, data});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"project.updated", entity:"Project", entityId:id, before:existing, after:updated});
    return NextResponse.json({ok:true, project:updated});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({ok:true, mocked:true});
  try{
    const existing = await prisma.project.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    if(existing.status==="Active") return NextResponse.json({error:"Cannot delete active project — set to Cancelled instead"},{status:400});
    await prisma.project.delete({where:{id}});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"project.deleted", entity:"Project", entityId:id, before:existing});
    return NextResponse.json({ok:true});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
