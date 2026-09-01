import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

const mockInvoices: Array<Record<string,unknown>> = [
  { id:"inv1", businessId:"mock-biz", invoiceNumber:"INV-001", customerId:"c1", customerName:"John Doe", invoiceDate:"2026-09-01", dueDate:"2026-09-15", subtotal:"500000.00", discount:"0", tax:"0", total:"500000.00", amountPaid:"450000.00", balanceDue:"50000.00", currency:"NGN", status:"PartiallyPaid", items:[{description:"Website Development", quantity:1, unitPrice:500000, amount:500000}] },
  { id:"inv2", businessId:"mock-biz", invoiceNumber:"INV-002", customerId:"c2", customerName:"Ada Lovelace", invoiceDate:"2026-09-05", dueDate:"2026-09-20", subtotal:"300000.00", discount:"10000.00", tax:"0", total:"290000.00", amountPaid:"0", balanceDue:"290000.00", currency:"NGN", status:"Sent" },
];

const itemSchema = z.object({ description: z.string().min(1).max(500), quantity: z.number().positive(), unitPrice: z.number().positive() });
const createSchema = z.object({
  customerId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  invoiceDate: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  currency: z.string().length(3).default("NGN"),
  notes: z.string().max(1000).optional().nullable(),
  terms: z.string().max(1000).optional().nullable(),
  invoiceNumber: z.string().max(50).optional(), // auto if not provided
});

function genInvoiceNumber(existing: string[]) {
  const nums = existing.map(n=> parseInt(n.replace(/\D/g,""))||0);
  const max = nums.length? Math.max(...nums):0;
  return `INV-${String(max+1).padStart(3,"0")}`;
}

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {searchParams}=new URL(req.url); const status=searchParams.get("status"); const q=searchParams.get("q")?.toLowerCase();
  if(isMockDb()){
    let f=[...mockInvoices];
    if(status) f=f.filter(i=> i.status===status);
    if(q) f=f.filter(i=> String(i.invoiceNumber).toLowerCase().includes(q) || String(i.customerName).toLowerCase().includes(q));
    return NextResponse.json({mocked:true, invoices:f, count:f.length});
  }
  try{
    const where:Record<string,unknown>={businessId:auth.businessId!};
    if(status) (where as Record<string,unknown>).status=status;
    if(q) (where as Record<string,unknown>).OR=[{invoiceNumber:{contains:q, mode:"insensitive"}},{customer:{fullName:{contains:q, mode:"insensitive"}}}];
    const invoices = await prisma.invoice.findMany({where: where as never, include:{customer:true, items:true}, orderBy:{invoiceDate:"desc"}, take:100});
    return NextResponse.json({invoices, count:invoices.length});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function POST(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=createSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});

  const d=p.data;
  let subtotal = d.items.reduce((s,it)=> s+ it.quantity * it.unitPrice,0);
  subtotal = Math.round(subtotal*100)/100;
  const total = Math.round((subtotal - d.discount + d.tax)*100)/100;

  if(isMockDb()){
    const inv={ id:"mock-inv-"+Date.now(), businessId:"mock-biz", invoiceNumber: d.invoiceNumber || genInvoiceNumber(mockInvoices.map(i=> i.invoiceNumber as string)), customerId:d.customerId, customerName:"Mock Customer", invoiceDate:d.invoiceDate, dueDate:d.dueDate||null, subtotal:String(subtotal), discount:String(d.discount), tax:String(d.tax), total:String(total), amountPaid:"0", balanceDue:String(total), currency:d.currency.toUpperCase(), status:"Draft", items:d.items.map(it=> ({...it, amount: it.quantity*it.unitPrice})) };
    mockInvoices.unshift(inv);
    return NextResponse.json({ok:true, mocked:true, invoice:inv},{status:201});
  }

  try{
    const customer = await prisma.customer.findFirst({where:{id:d.customerId, businessId:auth.businessId!}});
    if(!customer) return NextResponse.json({error:"Customer not found"},{status:404});
    if(d.projectId){
      const proj=await prisma.project.findFirst({where:{id:d.projectId, businessId:auth.businessId!}});
      if(!proj) return NextResponse.json({error:"Project not found"},{status:404});
    }
    let invoiceNumber = d.invoiceNumber?.trim();
    if(!invoiceNumber){
      const last = await prisma.invoice.findMany({where:{businessId:auth.businessId!}, select:{invoiceNumber:true}, take:50});
      invoiceNumber = genInvoiceNumber(last.map(l=> l.invoiceNumber));
    }
    const invoice = await prisma.invoice.create({
      data:{
        businessId:auth.businessId!,
        invoiceNumber,
        customerId:d.customerId,
        projectId:d.projectId||null,
        invoiceDate: new Date(d.invoiceDate),
        dueDate: d.dueDate? new Date(d.dueDate): null,
        subtotal,
        discount: d.discount,
        tax: d.tax,
        total,
        amountPaid:0,
        balanceDue: total,
        currency: d.currency.toUpperCase(),
        status:"Draft",
        notes: d.notes||null,
        terms: d.terms||null,
        items:{ create: d.items.map(it=> ({description:it.description, quantity:it.quantity, unitPrice:it.unitPrice, amount: Math.round(it.quantity*it.unitPrice*100)/100})) }
      },
      include:{items:true, customer:true}
    });
    await auditLog({businessId:auth.businessId!, userId:auth.userId, action:"invoice.created", entity:"Invoice", entityId:invoice.id, after:invoice});
    return NextResponse.json({ok:true, invoice},{status:201});
  }catch(e:unknown){
    const msg=e instanceof Error? e.message:String(e);
    if(msg.includes("Unique")) return NextResponse.json({error:"Invoice number already exists"},{status:409});
    console.error(e); return NextResponse.json({error:"Internal"},{status:500});
  }
}
