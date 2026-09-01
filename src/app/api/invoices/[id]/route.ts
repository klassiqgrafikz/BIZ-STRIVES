import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

const updateSchema = z.object({
  status: z.enum(["Draft","Sent","PartiallyPaid","Paid","Overdue","Cancelled"]).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  terms: z.string().max(1000).optional().nullable(),
  // record payment
  recordPayment: z.object({ amount: z.number().positive(), date: z.string().optional(), accountId: z.string().optional() }).optional(),
  duplicate: z.boolean().optional(),
});

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({mocked:true, invoice:{id, invoiceNumber:"INV-001", customerName:"John Doe", total:"500000.00", amountPaid:"450000.00", balanceDue:"50000.00", status:"PartiallyPaid", items:[{description:"Website", quantity:1, unitPrice:500000, amount:500000}]}});
  try{
    const inv = await prisma.invoice.findFirst({where:{id, businessId:auth.businessId!}, include:{customer:true, project:true, items:true, business:true}});
    if(!inv) return NextResponse.json({error:"Not found"},{status:404});
    return NextResponse.json({invoice:inv});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=updateSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  if(isMockDb()){
    if(p.data.duplicate) return NextResponse.json({ok:true, mocked:true, invoice:{id:"mock-inv-"+Date.now(), invoiceNumber:"INV-003", status:"Draft"}});
    if(p.data.recordPayment) return NextResponse.json({ok:true, mocked:true, message:"Payment recorded (mock)"});
    return NextResponse.json({ok:true, mocked:true});
  }
  try{
    const existing = await prisma.invoice.findFirst({where:{id, businessId:auth.businessId!}, include:{items:true}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});

    if(p.data.duplicate){
      const last = await prisma.invoice.findMany({where:{businessId:auth.businessId!}, select:{invoiceNumber:true}, take:50});
      const nums = last.map(l=> parseInt(l.invoiceNumber.replace(/\D/g,""))||0);
      const invNum = `INV-${String(Math.max(...nums,0)+1).padStart(3,"0")}`;
      const dup = await prisma.invoice.create({
        data:{
          businessId: auth.businessId!,
          invoiceNumber: invNum,
          customerId: existing.customerId,
          projectId: existing.projectId,
          invoiceDate: new Date(),
          dueDate: existing.dueDate,
          subtotal: existing.subtotal,
          discount: existing.discount,
          tax: existing.tax,
          total: existing.total,
          amountPaid: 0,
          balanceDue: existing.total,
          currency: existing.currency,
          status:"Draft",
          notes: existing.notes,
          terms: existing.terms,
          items:{ create: existing.items.map(it=> ({description:it.description, quantity:it.quantity, unitPrice:it.unitPrice, amount:it.amount}))}
        }
      });
      await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"invoice.duplicated", entity:"Invoice", entityId:dup.id});
      return NextResponse.json({ok:true, invoice:dup});
    }

    if(p.data.recordPayment){
      const amt = p.data.recordPayment.amount;
      const newPaid = Math.round((Number(existing.amountPaid)+ amt)*100)/100;
      if(newPaid > Number(existing.total)+0.01) return NextResponse.json({error:"Payment exceeds total"},{status:400});
      const balance = Math.round((Number(existing.total)- newPaid)*100)/100;
      let status: string = existing.status;
      if(balance<=0.01) status="Paid";
      else if(newPaid>0) status="PartiallyPaid";
      const updated = await prisma.invoice.update({where:{id}, data:{amountPaid:newPaid, balanceDue:balance, status: status as never}});
      // also create income transaction linked to invoice
      try{
        const base = Math.round(amt*100)/100;
        await prisma.transaction.create({
          data:{
            businessId: auth.businessId!,
            type:"INCOME",
            amount: amt,
            currency: existing.currency,
            exchangeRate:1,
            baseAmount: base,
            date: p.data.recordPayment.date ? new Date(p.data.recordPayment.date) : new Date(),
            customerId: existing.customerId,
            projectId: existing.projectId,
            accountId: p.data.recordPayment.accountId || null,
            description: `Payment for ${existing.invoiceNumber}`,
            reference: existing.invoiceNumber,
          }
        });
        if(existing.projectId){
          await prisma.project.update({where:{id:existing.projectId}, data:{amountPaid:{increment: amt}}}).catch(()=>{});
        }
      }catch{}
      await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"invoice.payment_recorded", entity:"Invoice", entityId:id, before:existing, after:updated});
      return NextResponse.json({ok:true, invoice:updated});
    }

    const data:Record<string,unknown>={};
    if(p.data.status!==undefined) data.status=p.data.status;
    if(p.data.dueDate!==undefined) data.dueDate=p.data.dueDate? new Date(p.data.dueDate): null;
    if(p.data.notes!==undefined) data.notes=p.data.notes;
    if(p.data.terms!==undefined) data.terms=p.data.terms;
    const updated = await prisma.invoice.update({where:{id}, data});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"invoice.updated", entity:"Invoice", entityId:id, before:existing, after:updated});
    return NextResponse.json({ok:true, invoice:updated});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({ok:true, mocked:true});
  try{
    const existing = await prisma.invoice.findFirst({where:{id, businessId:auth.businessId!}});
    if(!existing) return NextResponse.json({error:"Not found"},{status:404});
    if(existing.status==="Paid") return NextResponse.json({error:"Cannot delete paid invoice — set to Cancelled"},{status:400});
    await prisma.invoice.delete({where:{id}});
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"invoice.deleted", entity:"Invoice", entityId:id, before:existing});
    return NextResponse.json({ok:true});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
