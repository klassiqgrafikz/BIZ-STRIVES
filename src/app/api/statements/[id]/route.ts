import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

// Mock data for statement rendering
const mockStatement = {
  businessName:"Klassiq Grafikz",
  periodLabel:"August 1 — August 31, 2026",
  year:2026, month:8,
  summary:{openingBalance:0, totalIncome:500000, businessExpenses:100000, personalSpending:50000, moneyRemaining:350000, reservedSavings:100000, availableMoney:250000, closingBalance:350000},
  incomeDetails:[{date:"2026-08-05", customer:"John Doe", project:"Website Redesign", amount:500000, account:"GTBank", reference:"INV-001"}],
  expenseDetails:[{date:"2026-08-10", category:"Hosting", description:"Host + Domain", amount:60000, account:"GTBank"}, {date:"2026-08-15", category:"Internet", description:"Fibre", amount:40000, account:"OPay"}],
  personalDetails:[{date:"2026-08-12", category:"Food", description:"Groceries", amount:30000, account:"Cash"}, {date:"2026-08-20", category:"Transport", description:"Fuel", amount:20000, account:"Cash"}],
  savingsDetails:[{date:"2026-08-18", goal:"Emergency Fund", amount:100000}],
  accountSummary:[{name:"GTBank", opening:50000, in:500000, out:100000, closing:450000}, {name:"Cash", opening:10000, in:0, out:50000, closing:-40000}],
  customerSummary:[{customer:"John Doe", totalPaid:500000, outstanding:0}],
};

function buildHtml(s:any){
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BIZ-STRIVES Statement ${s.periodLabel}</title>
  <style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0f172a} h1{color:#166534;margin:0} h2{border-bottom:2px solid #16a34a;padding-bottom:6px} table{width:100%;border-collapse:collapse;margin:8px 0} th{background:#f1f5f9;text-align:left;padding:6px;font-size:12px} td{padding:6px;font-size:12px;border-bottom:1px solid #e2e8f0} .summary td{font-size:13px} .bold{font-weight:700} .muted{color:#64748b;font-size:11px}</style>
  </head><body>
  <h1>BIZ-STRIVES</h1><h3>${s.businessName}</h3>
  <p><strong>Period:</strong> ${s.periodLabel}</p>
  <h2>SUMMARY</h2>
  <table class="summary">
    <tr><td>Opening Balance</td><td style="text-align:right">₦${s.summary.openingBalance.toLocaleString()}</td></tr>
    <tr><td>Total Money Received</td><td style="text-align:right;font-weight:700">₦${s.summary.totalIncome.toLocaleString()}</td></tr>
    <tr><td>Total Business Expenses</td><td style="text-align:right;color:#dc2626">-₦${s.summary.businessExpenses.toLocaleString()}</td></tr>
    <tr><td>Total Personal Spending</td><td style="text-align:right;color:#dc2626">-₦${s.summary.personalSpending.toLocaleString()}</td></tr>
    <tr><td class="bold">Money Remaining</td><td style="text-align:right" class="bold">₦${s.summary.moneyRemaining.toLocaleString()}</td></tr>
    <tr><td>Reserved Savings</td><td style="text-align:right;color:#2563eb">₦${s.summary.reservedSavings.toLocaleString()}</td></tr>
    <tr><td class="bold">Available Money</td><td style="text-align:right" class="bold">₦${s.summary.availableMoney.toLocaleString()}</td></tr>
    <tr><td>Closing Balance</td><td style="text-align:right">₦${s.summary.closingBalance.toLocaleString()}</td></tr>
  </table>
  <h2>INCOME DETAILS</h2>
  <table><tr><th>Date</th><th>Customer</th><th>Project</th><th>Amount</th><th>Account</th></tr>
    ${s.incomeDetails.map((r:any)=> `<tr><td>${r.date}</td><td>${r.customer}</td><td>${r.project}</td><td>₦${r.amount.toLocaleString()}</td><td>${r.account}</td></tr>`).join("")}
  </table>
  <h2>BUSINESS EXPENSE DETAILS</h2>
  <table><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr>
    ${s.expenseDetails.map((r:any)=> `<tr><td>${r.date}</td><td>${r.category}</td><td>${r.description}</td><td>₦${r.amount.toLocaleString()}</td></tr>`).join("")}
  </table>
  <h2>PERSONAL SPENDING DETAILS</h2>
  <table><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr>
    ${s.personalDetails.map((r:any)=> `<tr><td>${r.date}</td><td>${r.category}</td><td>${r.description}</td><td>₦${r.amount.toLocaleString()}</td></tr>`).join("")}
  </table>
  <h2>SAVINGS DETAILS</h2>
  <table><tr><th>Date</th><th>Goal</th><th>Amount</th></tr>
    ${s.savingsDetails.map((r:any)=> `<tr><td>${r.date}</td><td>${r.goal}</td><td>₦${r.amount.toLocaleString()}</td></tr>`).join("")}
  </table>
  <h2>ACCOUNT SUMMARY</h2>
  <table><tr><th>Account</th><th>Opening</th><th>Money In</th><th>Money Out</th><th>Closing</th></tr>
    ${s.accountSummary.map((r:any)=> `<tr><td>${r.name}</td><td>₦${r.opening.toLocaleString()}</td><td>₦${r.in.toLocaleString()}</td><td>₦${r.out.toLocaleString()}</td><td>₦${r.closing.toLocaleString()}</td></tr>`).join("")}
  </table>
  <h2>CUSTOMER SUMMARY</h2>
  <table><tr><th>Customer</th><th>Total Paid</th><th>Outstanding</th></tr>
    ${s.customerSummary.map((r:any)=> `<tr><td>${r.customer}</td><td>₦${r.totalPaid.toLocaleString()}</td><td>₦${r.outstanding.toLocaleString()}</td></tr>`).join("")}
  </table>
  <p class="muted">Generated by BIZ-STRIVES • ${new Date().toISOString()} • Rule: Savings is reserved, not expense • Transfers excluded</p>
  </body></html>`;
}

function buildCsv(s:any){
  const rows:any[] = [];
  rows.push(["BIZ-STRIVES", s.businessName]);
  rows.push(["Period", s.periodLabel]);
  rows.push([]);
  rows.push(["SUMMARY","Amount"]);
  rows.push(["Opening Balance", s.summary.openingBalance]);
  rows.push(["Total Money Received", s.summary.totalIncome]);
  rows.push(["Business Expenses", s.summary.businessExpenses]);
  rows.push(["Personal Spending", s.summary.personalSpending]);
  rows.push(["Money Remaining", s.summary.moneyRemaining]);
  rows.push(["Reserved Savings", s.summary.reservedSavings]);
  rows.push(["Available Money", s.summary.availableMoney]);
  rows.push([]);
  rows.push(["INCOME","Date","Customer","Project","Amount","Account"]);
  s.incomeDetails.forEach((r:any)=> rows.push(["",r.date,r.customer,r.project,r.amount,r.account]));
  rows.push([]);
  rows.push(["EXPENSE","Date","Category","Description","Amount"]);
  s.expenseDetails.forEach((r:any)=> rows.push(["",r.date,r.category,r.description,r.amount]));
  return rows.map((r:Array<unknown>)=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
}

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {searchParams}=new URL(req.url); const format=searchParams.get("format")||"html";

  // Try load real statement; fallback to mock
  let s:any = mockStatement;
  if(!isMockDb()){
    try{
      const stmt = await prisma.statement.findFirst({where:{id, businessId:auth.businessId!}, include:{period:true, business:true}});
      if(stmt){
        // For V1, still use mock detail but with real period/biz header
        s = {...mockStatement, businessName: stmt.business.name, periodLabel: `${stmt.period.year}-${String(stmt.period.month).padStart(2,"0")}`, summary: {...mockStatement.summary, totalIncome: Number(stmt.period.totalIncome), businessExpenses: Number(stmt.period.businessExpenses)} };
      }
    }catch{}
  }

  if(format==="csv"){
    const csv = buildCsv(s);
    return new NextResponse(csv, {headers:{"Content-Type":"text/csv","Content-Disposition":`attachment; filename="BIZ-STRIVES-${s.year}-${String(s.month).padStart(2,"0")}.csv"`}});
  }
  if(format==="pdf"){
    // Serve HTML that browsers can Save as PDF; server pdf-lib would be next iteration
    // For Vercel-unified, we return HTML with print styles; frontend calls window.print()
    const html = buildHtml(s);
    return new NextResponse(html, {headers:{"Content-Type":"text/html"}});
  }
  // default json details
  return NextResponse.json({statement: s, id});
}
