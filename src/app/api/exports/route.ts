import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {searchParams}=new URL(req.url);
  const format = searchParams.get("format")||"csv"; // csv | pdf
  const entity = searchParams.get("entity")||"transactions"; // transactions, customers, etc.
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if(isMockDb()){
    const csv = `BIZ-STRIVES Export — ${entity}\nPeriod,${from||"all"} to ${to||"all"}\n\nID,Type,Amount,Currency,Date,Description\nm1,INCOME,500000,NGN,2026-09-01,Website project\nm2,BUSINESS_EXPENSE,100000,NGN,2026-09-02,Hosting\n`;
    if(format==="csv"){
      return new NextResponse(csv, {headers:{"Content-Type":"text/csv","Content-Disposition":`attachment; filename="bizstrives-${entity}.csv"`}});
    }
    const html=`<html><body><h1>BIZ-STRIVES Export — ${entity}</h1><p>Period ${from||"all"} to ${to||"all"}</p><pre>${csv}</pre><p>PDF export stub — server pdf-lib next iteration.</p></body></html>`;
    return new NextResponse(html, {headers:{"Content-Type":"text/html"}});
  }

  try{
    const businessId = auth.businessId!;
    let csv="";

    if(entity==="transactions"){
      const where:Record<string,unknown>={businessId};
      if(from||to){
        const date:Record<string,Date>={};
        if(from) date.gte=new Date(from);
        if(to) date.lte=new Date(to);
        (where as Record<string,unknown>).date=date;
      }
      const txs = await prisma.transaction.findMany({where: where as never, orderBy:{date:"asc"}, take:1000});
      csv=`ID,Type,Amount,Currency,ExchangeRate,BaseAmount,Date,Category,Account,Description\n` +
        txs.map(t=> `${t.id},${t.type},${String(t.amount)},${t.currency},${String(t.exchangeRate)},${String(t.baseAmount)},${t.date.toISOString().slice(0,10)},${t.categoryId||""},${t.accountId||""},"${(t.description||"").replace(/"/g,'""')}"`).join("\n");
    } else if(entity==="customers"){
      const customers = await prisma.customer.findMany({where:{businessId}, take:1000});
      csv=`ID,FullName,Email,Phone,Company,Birthday,Address\n` +
        customers.map(c=> `${c.id},"${c.fullName}","${c.email||""}","${c.phone||""}","${c.company||""}",${c.birthday? c.birthday.toISOString().slice(0,10):""},"${(c.address||"").replace(/"/g,'""')}"`).join("\n");
    } else {
      return NextResponse.json({error:"Unknown entity — use transactions or customers"},{status:400});
    }

    if(format==="csv"){
      return new NextResponse(csv, {headers:{"Content-Type":"text/csv","Content-Disposition":`attachment; filename="bizstrives-${entity}-${from||"all"}-to-${to||"all"}.csv"`}});
    }
    // pdf: return html for now
    const html=`<html><body style="font-family:monospace;padding:24px"><h1>BIZ-STRIVES — ${entity}</h1><p>Period ${from||"all"} to ${to||"all"}</p><pre style="font-size:11px;white-space:pre-wrap">${csv}</pre></body></html>`;
    return new NextResponse(html, {headers:{"Content-Type":"text/html"}});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
