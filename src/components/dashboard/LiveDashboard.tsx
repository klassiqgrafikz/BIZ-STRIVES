"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

type Totals = {totalIncome:number; businessExpenses:number; personalSpending:number; moneyRemaining:number; reservedSavings:number; availableMoney:number; transfers:number};

export default function LiveDashboard(){
  const [totals,setTotals]=useState<Totals|null>(null);
  const [reserved,setReserved]=useState(0);
  const [outstanding,setOutstanding]=useState(0);
  const [customerCount,setCustomerCount]=useState(0);
  const [recent,setRecent]=useState<Array<{id:string; type:string; amount:string; description?:string; date:string}>>([]);
  const [projectCount,setProjectCount]=useState(0);
  const [loading,setLoading]=useState(true);
  const [period,setPeriod]=useState("thisMonth");

  async function load(p:string){
    setLoading(true);
    const [t,s,inv,cust,proj]=await Promise.all([
      fetch(`/api/transactions?period=${p}`).then(r=>r.json()).catch(()=>({totals:null})),
      fetch(`/api/savings/goals`).then(r=>r.json()).catch(()=>({totalReserved:0})),
      fetch(`/api/invoices`).then(r=>r.json()).catch(()=>({invoices:[]})),
      fetch(`/api/customers`).then(r=>r.json()).catch(()=>({customers:[]})),
      fetch(`/api/projects`).then(r=>r.json()).catch(()=>({projects:[]})),
    ]);
    if(t.totals) setTotals(t.totals);
    if(t.transactions) setRecent(t.transactions.slice(0,5));
    if(s.totalReserved!==undefined) setReserved(s.totalReserved);
    if(inv.invoices) setOutstanding(inv.invoices.reduce((sum:number,inv:{balanceDue:string})=> sum+Number(inv.balanceDue),0));
    if(cust.customers) setCustomerCount(cust.customers.length);
    if(proj.projects) setProjectCount(proj.projects.filter((p:{status:string})=> p.status==="Active").length);
    setLoading(false);
  }

  useEffect(()=>{ load(period); },[period]);

  if(loading) return <p className="text-sm text-slate-500">Loading dashboard…</p>;

  // Fallback demo totals if none (first load)
  const demo:Totals = totals || {totalIncome:500000, businessExpenses:100000, personalSpending:50000, moneyRemaining:350000, reservedSavings:120000, availableMoney:230000, transfers:20000};
  const avail = demo.moneyRemaining - reserved;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Financial Overview — {period}</h2>
        <div className="flex gap-2">
          {["today","thisWeek","thisMonth","lastMonth","thisYear"].map(p=> (
            <button key={p} onClick={()=>setPeriod(p)} className={`rounded-full px-3 py-1 text-xs border ${period===p?"bg-emerald-600 text-white border-emerald-600":"bg-white border-slate-200"}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs text-slate-500">Total Money Received</p><p className="text-xl font-bold">{formatMoney(demo.totalIncome,"NGN")}</p></div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-xs text-slate-500">Business Expenses</p><p className="text-xl font-bold text-red-600">-{formatMoney(demo.businessExpenses,"NGN")}</p></div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs text-slate-500">Personal Spending</p><p className="text-xl font-bold text-orange-600">-{formatMoney(demo.personalSpending,"NGN")}</p></div>
        <div className="rounded-2xl border-2 border-emerald-300 bg-white p-4"><p className="text-xs text-slate-500">Money Remaining</p><p className="text-xl font-bold text-emerald-700">{formatMoney(demo.moneyRemaining,"NGN")}</p><p className="text-xs text-slate-500">In − Biz − Personal</p></div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs text-slate-500">Reserved Savings</p><p className="text-xl font-bold text-blue-600">{formatMoney(reserved,"NGN")}</p><p className="text-xs text-slate-500">Not an expense (Rule 2)</p></div>
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4"><p className="text-xs text-slate-500">Available Money</p><p className="text-xl font-bold text-emerald-700">{formatMoney(avail,"NGN")}</p><p className="text-xs text-slate-500">Remaining − Reserved</p></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs text-slate-500">Outstanding Invoices</p><p className="text-xl font-bold text-amber-700">{formatMoney(outstanding,"NGN")}</p><p className="text-xs text-slate-500">Unpaid balance</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Customers • Projects</p><p className="text-xl font-bold">{customerCount} • {projectCount} active</p><p className="text-xs text-slate-500">Total / Active</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Recent Transactions</h3>
          <p className="text-xs text-slate-500">Last 5 — income / expense / personal / savings / transfer</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.length===0? <li className="py-4 text-center text-sm text-slate-400">No recent transactions. <Link href="/transactions" className="underline">Add one →</Link></li> :
              recent.map(r=> (
                <li key={r.id} className="flex justify-between py-2 text-sm">
                  <span><span className={`rounded-full px-2 py-1 text-xs border ${r.type==="INCOME"?"bg-emerald-50 border-emerald-200 text-emerald-700": r.type==="BUSINESS_EXPENSE"?"bg-red-50 border-red-200 text-red-700":"bg-slate-50"}`}>{r.type}</span> <span className="ml-2 text-slate-600">{r.description||"—"}</span></span>
                  <span className="font-medium">{r.type==="BUSINESS_EXPENSE"||r.type==="PERSONAL_SPENDING"?"-":""}{formatMoney(Number(r.amount),"NGN")}</span>
                </li>
              ))}
          </ul>
          <Link href="/transactions" className="mt-3 inline-block text-xs font-medium text-emerald-700 hover:underline">View all →</Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Quick Actions</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              {label:"+ Add Income", href:"/transactions"},
              {label:"+ Add Business Expense", href:"/transactions"},
              {label:"+ Add Personal Spending", href:"/transactions"},
              {label:"+ Add Customer", href:"/customers"},
              {label:"+ Create Project", href:"/projects"},
              {label:"+ Create Invoice", href:"/invoices"},
              {label:"+ Add Savings", href:"/savings"},
              {label:"⇄ Transfer Money", href:"/accounts"},
            ].map(a=> (
              <Link key={a.label} href={a.href as never} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-center hover:bg-white hover:shadow">{a.label}</Link>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-medium">Charts (Phase 10)</p>
            <div className="mt-2 space-y-2">
              <div><p className="text-xs text-slate-500">Income over time</p><div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-emerald-600" style={{width:"72%"}}/></div></div>
              <div><p className="text-xs text-slate-500">Expenses</p><div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-red-500" style={{width:"34%"}}/></div></div>
              <div><p className="text-xs text-slate-500">Savings progress</p><div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-blue-600" style={{width: `${Math.min(100, reserved/5000)}%`}}/></div></div>
            </div>
            <Link href="/reports" className="mt-2 inline-block text-xs text-emerald-700 hover:underline">Detailed reports →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
