import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

// Mock data for search
const mockData = {
  customers: [
    {id:"c1", type:"customer", title:"John Doe", subtitle:"john@example.com • Doe Enterprises", href:"/customers/c1", match:"name/email/company"},
    {id:"c2", type:"customer", title:"Ada Lovelace", subtitle:"ada@klassiq.com", href:"/customers/c2", match:"name"},
  ],
  projects: [
    {id:"p1", type:"project", title:"Website Redesign", subtitle:"John Doe • Website Development • Active", href:"/projects/p1", match:"name"},
  ],
  invoices: [
    {id:"inv1", type:"invoice", title:"INV-001", subtitle:"John Doe • ₦500k • PartiallyPaid", href:"/invoices/inv1", match:"number"},
  ],
  transactions: [
    {id:"m1", type:"transaction", title:"Website project — John Doe", subtitle:"INCOME • ₦500k • 2026-09-01", href:"/transactions", match:"description"},
  ],
  statements: [
    {id:"s1", type:"statement", title:"2026-08 Statement", subtitle:"August 2026 • Closed • ₦350k remaining", href:"/statements", match:"period"},
  ],
};

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {searchParams}=new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim() || "";
  const typeFilter = searchParams.get("type"); // customer, project, etc.
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");
  const category = searchParams.get("category");
  const accountId = searchParams.get("account");
  const currency = searchParams.get("currency");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");

  if(!q && !typeFilter && !dateFrom && !category) {
    return NextResponse.json({results:[], count:0, hint:"Provide ?q= or filters"});
  }

  if(isMockDb()){
    let results: Array<Record<string,unknown>> = [...mockData.customers, ...mockData.projects, ...mockData.invoices, ...mockData.transactions, ...mockData.statements];
    if(q) results = results.filter(r=> String(r.title).toLowerCase().includes(q) || String(r.subtitle).toLowerCase().includes(q));
    if(typeFilter) results = results.filter(r=> r.type===typeFilter);
    // date/category/account filters would apply to transactions in real DB
    return NextResponse.json({mocked:true, results, count: results.length, query:q, filters:{type:typeFilter, from:dateFrom, to:dateTo, category, account:accountId, currency, minAmount, maxAmount}});
  }

  try{
    const businessId = auth.businessId!;
    const results: Array<Record<string,unknown>> = [];

    // Search each table with insensitivity; limit 10 each
    if(!typeFilter || typeFilter==="customer"){
      const customers = await prisma.customer.findMany({
        where:{businessId, OR: q? [{fullName:{contains:q, mode:"insensitive"}},{email:{contains:q, mode:"insensitive"}},{phone:{contains:q, mode:"insensitive"}},{company:{contains:q, mode:"insensitive"}}]: undefined},
        take:10,
      });
      customers.forEach(c=> results.push({id:c.id, type:"customer", title:c.fullName, subtitle:`${c.email||""} ${c.company?`• ${c.company}`:""}`.trim(), href:`/customers/${c.id}`}));
    }
    if(!typeFilter || typeFilter==="project"){
      const projects = await prisma.project.findMany({
        where:{businessId, ...(q? {name:{contains:q, mode:"insensitive"}}:{}),},
        take:10, include:{customer:true}
      });
      projects.forEach(p=> results.push({id:p.id, type:"project", title:p.name, subtitle:`${p.customer.fullName} • ${p.status}`, href:`/projects/${p.id}`}));
    }
    if(!typeFilter || typeFilter==="invoice"){
      const invoices = await prisma.invoice.findMany({
        where:{businessId, ...(q? {invoiceNumber:{contains:q, mode:"insensitive"}}:{})},
        take:10, include:{customer:true}
      });
      invoices.forEach(i=> results.push({id:i.id, type:"invoice", title:i.invoiceNumber, subtitle:`${i.customer.fullName} • ${i.status}`, href:`/invoices/${i.id}`}));
    }
    if(!typeFilter || typeFilter==="transaction"){
      const where:Record<string,unknown>={businessId};
      if(q) (where as Record<string,unknown>).OR=[{description:{contains:q, mode:"insensitive"}},{vendor:{contains:q, mode:"insensitive"}},{reference:{contains:q, mode:"insensitive"}}];
      if(dateFrom || dateTo){
        const date:Record<string,Date>={};
        if(dateFrom) date.gte=new Date(dateFrom);
        if(dateTo) date.lte=new Date(dateTo);
        (where as Record<string,unknown>).date=date;
      }
      if(category) (where as Record<string,unknown>).categoryId=category;
      if(accountId) (where as Record<string,unknown>).accountId=accountId;
      if(currency) (where as Record<string,unknown>).currency=currency.toUpperCase();
      // amount range would need gte/lte on Decimal
      const txs = await prisma.transaction.findMany({where: where as never, take:10, orderBy:{date:"desc"}});
      txs.forEach(t=> results.push({id:t.id, type:"transaction", title:t.description|| t.type, subtitle:`${t.type} • ₦${Number(t.amount).toLocaleString()} • ${t.date.toISOString().slice(0,10)}`, href:`/transactions`}));
    }
    // statements
    if(!typeFilter || typeFilter==="statement"){
      if(q && (q.includes("statement") || q.match(/\d{4}/))){
        const statements = await prisma.statement.findMany({where:{businessId}, take:5, include:{period:true}});
        statements.forEach(s=> results.push({id:s.id, type:"statement", title:`${s.period.year}-${String(s.period.month).padStart(2,"0")} Statement`, subtitle:`${s.period.status}`, href:`/statements`}));
      }
    }

    let filtered = results;
    if(minAmount) filtered = filtered.filter(()=> true); // placeholder for amount filter on transactions
    if(q) filtered = filtered.filter(r=> String(r.title).toLowerCase().includes(q) || String(r.subtitle).toLowerCase().includes(q));

    return NextResponse.json({results: filtered.slice(0,20), count: filtered.length, query:q});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
