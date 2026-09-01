import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";
import { calculatePeriodTotals, getMonthBounds } from "@/lib/finance/calculations";
import { notify } from "@/lib/notifications";
import { sendEmail, monthlyStatementHtml } from "@/lib/email/resend";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

const mockPeriods: Array<Record<string,unknown>> = [
  { id:"mp-aug2026", businessId:"mock-biz", year:2026, month:8, openingBalance:"0.00", totalIncome:"500000.00", businessExpenses:"100000.00", personalSpending:"50000.00", savingsAllocated:"100000.00", transfers:"20000.00", moneyRemaining:"350000.00", closingBalance:"350000.00", transactionCount:4, status:"Closed", closedAt:"2026-08-31T22:00:00Z" },
  { id:"mp-sep2026", businessId:"mock-biz", year:2026, month:9, openingBalance:"350000.00", totalIncome:"250000.00", businessExpenses:"40000.00", personalSpending:"20000.00", savingsAllocated:"50000.00", transfers:"0.00", moneyRemaining:"190000.00", closingBalance:"540000.00", transactionCount:3, status:"Open" },
];

const closeSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  emailStatement: z.boolean().optional().default(true),
});

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()) return NextResponse.json({mocked:true, periods: mockPeriods, count: mockPeriods.length});

  try{
    const periods = await prisma.monthlyPeriod.findMany({where:{businessId:auth.businessId!}, orderBy:[{year:"desc"},{month:"desc"}], include:{statements:true}});
    return NextResponse.json({periods, count:periods.length});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function POST(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=closeSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  const {year, month, emailStatement}=p.data;

  if(isMockDb()){
    const existing = mockPeriods.find(x=> x.year===year && x.month===month);
    if(existing && existing.status==="Closed") return NextResponse.json({error:"Period already closed — reopen to edit"},{status:423});
    // Simulate totals
    const totals = calculatePeriodTotals([
      {type:"INCOME", amount:500000, date:new Date(year, month-1, 5)},
      {type:"BUSINESS_EXPENSE", amount:100000, date:new Date(year, month-1, 10)},
      {type:"PERSONAL_SPENDING", amount:50000, date:new Date(year, month-1, 15)},
    ], {savingsAllocations:[{amount:100000, type:"CONTRIBUTION"}]});
    const prev = mockPeriods.find(x=> x.year===year && x.month===month-1) || mockPeriods[0];
    const opening = Number(prev?.closingBalance || 0);
    const closing = opening + totals.moneyRemaining;
    const period = {id:`mock-mp-${year}-${month}`, businessId:"mock-biz", year, month, openingBalance:String(opening), totalIncome:String(totals.totalIncome), businessExpenses:String(totals.businessExpenses), personalSpending:String(totals.personalSpending), savingsAllocated:String(totals.savingsAllocated), transfers:String(totals.transfers), moneyRemaining:String(totals.moneyRemaining), closingBalance:String(closing), transactionCount:3, status:"Closed", closedAt:new Date().toISOString()};
    mockPeriods.unshift(period as never);
    // Mock notification + email log
    return NextResponse.json({ok:true, mocked:true, period, notification:{title:"August statement generated"}, email: emailStatement? {sent:true, mocked:true}: {sent:false}});
  }

  try{
    const businessId = auth.businessId!;
    // Check existing
    let period = await prisma.monthlyPeriod.findUnique({where:{businessId_year_month:{businessId, year, month}}});
    if(period?.status==="Closed") return NextResponse.json({error:"Period already closed — reopen to edit (Rule 7)"},{status:423});

    // Load transactions for month
    const {from, to} = getMonthBounds(year, month);
    const txs = await prisma.transaction.findMany({where:{businessId, date:{gte:from, lte:to}}});
    const allocations = await prisma.savingsAllocation.findMany({where:{businessId, date:{gte:from, lte:to}}});
    const totals = calculatePeriodTotals(
      txs.map(t=>({type: t.type as never, amount: Number(t.amount), baseAmount: Number(t.baseAmount), date: t.date})),
      {savingsAllocations: allocations.map(a=>({amount:Number(a.amount), type: a.type as never}))}
    );

    // Opening balance from previous month's closing
    let openingBalance = 0;
    if(month>1){
      const prev = await prisma.monthlyPeriod.findUnique({where:{businessId_year_month:{businessId, year, month: month-1}}});
      if(prev) openingBalance = Number(prev.closingBalance);
    } else {
      const prevY = await prisma.monthlyPeriod.findUnique({where:{businessId_year_month:{businessId, year: year-1, month:12}}});
      if(prevY) openingBalance = Number(prevY.closingBalance);
    }
    const closingBalance = Math.round((openingBalance + totals.moneyRemaining)*100)/100;

    if(period){
      period = await prisma.monthlyPeriod.update({
        where:{id: period.id},
        data:{
          openingBalance, totalIncome: totals.totalIncome, businessExpenses: totals.businessExpenses, personalSpending: totals.personalSpending,
          savingsAllocated: totals.savingsAllocated, transfers: totals.transfers, moneyRemaining: totals.moneyRemaining, closingBalance,
          transactionCount: txs.length, status:"Closed", closedAt: new Date(), reopenedAt: null,
        }
      });
    } else {
      period = await prisma.monthlyPeriod.create({
        data:{
          businessId, year, month, openingBalance, totalIncome: totals.totalIncome, businessExpenses: totals.businessExpenses,
          personalSpending: totals.personalSpending, savingsAllocated: totals.savingsAllocated, transfers: totals.transfers,
          moneyRemaining: totals.moneyRemaining, closingBalance, transactionCount: txs.length, status:"Closed", closedAt: new Date(),
        }
      });
    }

    await auditLog({businessId, userId:auth.userId, action:"month.closed", entity:"MonthlyPeriod", entityId: period.id, after: period});

    // Generate statement
    const statement = await prisma.statement.create({
      data:{ businessId, periodId: period.id, pdfUrl: `/api/statements/${period.id}?format=pdf`, csvUrl: `/api/statements/${period.id}?format=csv` }
    });

    await notify({
      businessId, userId: auth.userId,
      type:"StatementGenerated",
      title: `${year}-${String(month).padStart(2,"0")} statement generated`,
      message: `Money remaining: ₦${totals.moneyRemaining.toLocaleString()} • Available: ₦${(totals.moneyRemaining - totals.savingsAllocated).toLocaleString()}`,
      actionLink: `/statements`,
    });

    // Email automation — best effort
    if(emailStatement){
      const business = await prisma.business.findUnique({where:{id:businessId}});
      const recipient = business?.statementEmail || business?.email || (await prisma.user.findUnique({where:{id:auth.userId}}))?.email || "";
      if(recipient){
        const html = monthlyStatementHtml({
          businessName: business?.name || "BIZ-STRIVES",
          periodLabel: `${year}-${String(month).padStart(2,"0")}`,
          summary: {totalIncome: totals.totalIncome, businessExpenses: totals.businessExpenses, personalSpending: totals.personalSpending, moneyRemaining: totals.moneyRemaining, availableMoney: totals.moneyRemaining - totals.savingsAllocated, reservedSavings: totals.savingsAllocated},
        });
        const result = await sendEmail({to: recipient, subject:`${business?.name} — ${year}-${String(month).padStart(2,"0")} Statement`, html});
        await prisma.emailLog.create({
          data:{ businessId, recipient, type:"monthly_statement", subject:`${year}-${String(month).padStart(2,"0")} Statement`, status: result.ok? "Sent":"Failed", errorMessage: result.error || null, sentAt: result.ok? new Date(): null}
        });
        if(!result.ok){
          await notify({businessId, userId:auth.userId, type:"System", title:"Statement email failed", message: result.error || "Retry scheduled", actionLink:"/statements"});
        }
      }
    }

    return NextResponse.json({ok:true, period, statement});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
