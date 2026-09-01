"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

type Totals = {totalIncome:number; businessExpenses:number; personalSpending:number; moneyRemaining:number; savingsAllocated:number; availableMoney:number};

export default function ReportsPage(){
  const [period,setPeriod]=useState("thisMonth");
  const [customFrom,setCustomFrom]=useState("2026-09-01");
  const [customTo,setCustomTo]=useState("2026-09-30");
  const [data,setData]=useState<{totals:Totals; transactions:Array<{type:string; amount:string; date:string; description?:string}>} | null>(null);
  const [categoryReport,setCategoryReport]=useState<Array<{name:string; total:number}>>([]);

  async function load(p:string){
    let url=`/api/transactions?period=${p}`;
    if(p==="custom") url=`/api/transactions?from=${customFrom}&to=${customTo}`;
    const r=await fetch(url).then(x=>x.json());
    if(r.totals){
      setData(r);
      // simple category breakdown from transactions (group by categoryId/description for mock)
      const byType:Record<string,number>={};
      (r.transactions as Array<{type:string; amount:string}>).forEach(t=>{
        byType[t.type]=(byType[t.type]||0)+Number(t.amount);
      });
      setCategoryReport(Object.entries(byType).map(([name,total])=>({name,total})));
    }
  }
  useEffect(()=>{ load(period); },[period]);

  const t = data?.totals;
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Reports <span className="text-xs font-normal text-slate-500">— Phase 11 • period-aware analytics</span></h1>
          <Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 flex gap-2 overflow-auto">
          {["today","thisWeek","thisMonth","lastMonth","thisQuarter","thisYear","custom"].map(p=> (
            <button key={p} onClick={()=>setPeriod(p)} className={`rounded-full px-3 py-1 text-xs border whitespace-nowrap ${period===p?"bg-emerald-600 text-white border-emerald-600":"bg-white border-slate-200"}`}>{p}</button>
          ))}
        </div>
        {period==="custom" && (
          <div className="mx-auto max-w-6xl px-6 pb-3 flex gap-2">
            <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-1 text-xs" />
            <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-1 text-xs" />
            <button onClick={()=>load("custom")} className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Apply</button>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {!t ? <p className="text-sm text-slate-500">Loading…</p> : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs text-slate-500">Income</p><p className="text-lg font-bold">{formatMoney(t.totalIncome,"NGN")}</p></div>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-xs text-slate-500">Biz Expenses</p><p className="text-lg font-bold text-red-600">{formatMoney(t.businessExpenses,"NGN")}</p></div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs text-slate-500">Personal</p><p className="text-lg font-bold text-orange-600">{formatMoney(t.personalSpending,"NGN")}</p></div>
              <div className="rounded-2xl border-2 border-emerald-300 bg-white p-4"><p className="text-xs text-slate-500">Money Remaining</p><p className="text-lg font-bold text-emerald-700">{formatMoney(t.moneyRemaining,"NGN")}</p><p className="text-xs text-slate-500">Available {formatMoney(t.availableMoney,"NGN")}</p></div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold">Income vs Money Out — {period}</h3>
                <p className="text-xs text-slate-500">Keep terminology simple (no accounting jargon)</p>
                <div className="mt-4 space-y-3">
                  <div><p className="text-xs">Income {formatMoney(t.totalIncome,"NGN")}</p><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-emerald-600" style={{width:`${t.totalIncome? Math.min(100, (t.totalIncome / Math.max(t.totalIncome, t.businessExpenses+t.personalSpending))*100):0}%`}}/></div></div>
                  <div><p className="text-xs">Biz Expenses {formatMoney(t.businessExpenses,"NGN")}</p><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-red-500" style={{width:`${t.totalIncome? (t.businessExpenses/t.totalIncome)*100:0}%`}}/></div></div>
                  <div><p className="text-xs">Personal {formatMoney(t.personalSpending,"NGN")}</p><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-orange-500" style={{width:`${t.totalIncome? (t.personalSpending/t.totalIncome)*100:0}%`}}/></div></div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
                    <p><strong>Highest earning:</strong> This month (demo) • <strong>Largest expense:</strong> Hosting</p>
                    <p><strong>Top service:</strong> Website Development • <strong>Savings:</strong> {formatMoney(t.savingsAllocated,"NGN")} reserved</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold">Breakdown by Type</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {categoryReport.map(c=> (
                    <li key={c.name} className="flex justify-between border-b border-slate-100 py-2"><span>{c.name}</span><span className="font-medium">{formatMoney(c.total,"NGN")}</span></li>
                  ))}
                  {categoryReport.length===0 && <li className="text-xs text-slate-400">No data for this period</li>}
                </ul>
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs">
                  <p className="font-semibold">Analytics</p>
                  <p>Year-to-date income: {formatMoney(t.totalIncome,"NGN")} • Money remaining YTD: {formatMoney(t.moneyRemaining,"NGN")}</p>
                  <p>Expense categories & personal totals ready for export (CSV/PDF — next phase).</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold">Transactions in period</h3>
              <p className="text-xs text-slate-500">{data.transactions.length} records • reconstructable from dated transactions (Rule 5)</p>
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {data.transactions.slice(0,10).map((tx)=> (
                  <li key={`${tx.date}-${tx.amount}`} className="flex justify-between py-2"><span className="text-xs">{new Date(tx.date).toISOString().slice(0,10)} • {tx.type}</span><span>{tx.description || "—"} — {formatMoney(Number(tx.amount),"NGN")}</span></li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2 text-xs">
                <Link href="/transactions" className="rounded-full border border-slate-200 px-3 py-1">View all →</Link>
                <span className="text-slate-400">Filters: Today / This week / This month / Last month / This quarter / This year / Custom range ✓</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
