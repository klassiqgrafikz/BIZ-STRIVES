"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

type Period = {id:string; year:number; month:number; openingBalance:string; totalIncome:string; businessExpenses:string; personalSpending:string; moneyRemaining:string; closingBalance:string; transactionCount:number; status:string; closedAt?:string};
type Statement = {id:string; periodId:string; year?:number; month?:number; status?:string; pdfUrl?:string; csvUrl?:string};

export default function StatementsPage(){
  const [periods,setPeriods]=useState<Period[]>([]);
  const [statements,setStatements]=useState<Statement[]>([]);
  const [archive,setArchive]=useState<Record<string, Array<{month:number; name:string; status:string}>>>({});
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [msg,setMsg]=useState<string|null>(null);

  async function load(){
    const [p,s]=await Promise.all([fetch("/api/monthly-periods").then(r=>r.json()), fetch("/api/statements").then(r=>r.json())]);
    if(p.periods) setPeriods(p.periods);
    if(s.statements) setStatements(s.statements);
    if(s.archive) setArchive(s.archive);
  }
  useEffect(()=>{load();},[]);

  async function closeMonth(){
    const r=await fetch("/api/monthly-periods",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({year, month})});
    const j=await r.json();
    if(!r.ok) setMsg(j.error?String(j.error).slice(0,400):"Error");
    else { setMsg(j.mocked? "Month closed (mock) — statement + email + notification created" : "Month closed"); load(); }
  }

  async function reopen(id:string){
    if(!confirm("Reopen closed month? This will be audit-logged.")) return;
    const r=await fetch(`/api/monthly-periods/${id}`,{method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"reopen"})});
    const j=await r.json();
    if(!r.ok) setMsg(j.error?String(j.error).slice(0,400):"Error");
    else { setMsg("Reopened — you may now edit, then re-close to recalculate"); load(); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Statements <span className="text-xs font-normal text-slate-500">— Phases 12-14 • monthly record • PDF/CSV • email</span></h1>
          <div className="flex gap-2"><Link href="/reports" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Reports</Link><Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {msg && <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{msg} • <button onClick={()=>setMsg(null)} className="underline">dismiss</button></p>}

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Month-End Closing</h3>
          <p className="text-xs text-slate-500">Calculates totals from dated transactions (Rule 5), locks month (Rule 7), generates statement & emails via Resend. Timezone: business setting (default Africa/Lagos).</p>
          <div className="mt-3 flex gap-2 items-end">
            <label className="block"><span className="text-xs">Year</span><input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm w-24" /></label>
            <label className="block"><span className="text-xs">Month</span><input type="number" min={1} max={12} value={month} onChange={e=>setMonth(Number(e.target.value))} className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm w-20" /></label>
            <button onClick={closeMonth} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Close Month → Generate Statement + Email</button>
            <a href="/api/crons/month-end?force=1" target="_blank" className="rounded-xl border border-slate-200 px-3 py-2 text-xs">Test cron ?force=1</a>
          </div>
          <p className="text-xs text-slate-400 mt-2">Automation: Last day 22:00 UTC via <code className="bg-slate-100 px-1 rounded">vercel.json</code> cron → POST /api/monthly-periods per business.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold">Monthly Periods</h3>
            <div className="mt-3 space-y-2">
              {periods.map(p=> (
                <div key={p.id} className="rounded-xl border border-slate-200 p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{p.year}-{String(p.month).padStart(2,"0")} • {new Date(p.year, p.month-1,1).toLocaleDateString("en-NG",{month:"long"})} • <span className={`rounded-full px-2 py-1 text-xs border ${p.status==="Closed"?"bg-slate-900 text-white":"bg-emerald-50 border-emerald-200 text-emerald-700"}`}>{p.status}</span></p>
                    <p className="text-xs text-slate-500">In {formatMoney(Number(p.totalIncome),"NGN")} • Biz {formatMoney(Number(p.businessExpenses),"NGN")} • Personal {formatMoney(Number(p.personalSpending),"NGN")} • Remaining <strong>{formatMoney(Number(p.moneyRemaining),"NGN")}</strong> • {p.transactionCount} tx</p>
                    <p className="text-xs text-slate-400">Opening {formatMoney(Number(p.openingBalance),"NGN")} → Closing {formatMoney(Number(p.closingBalance),"NGN")} {p.closedAt? `• closed ${new Date(p.closedAt).toLocaleDateString()}`:""}</p>
                  </div>
                  <div className="flex gap-2">
                    {p.status==="Closed" ? <button onClick={()=>reopen(p.id)} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs">Reopen</button> : <span className="text-xs text-slate-400">Open — editable</span>}
                  </div>
                </div>
              ))}
              {periods.length===0 && <p className="text-sm text-slate-400">No periods yet. Close a month above.</p>}
            </div>
            <p className="text-xs text-slate-400 mt-3">Closed months are LOCKED (view/export only). Reopen → correct → re-close (audit-logged, Rule 7).</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold">Statements Archive</h3>
            <p className="text-xs text-slate-500">Per Phase 13 — by year/month, PDF + CSV</p>
            <div className="mt-3 space-y-3">
              {Object.keys(archive).length===0? <p className="text-sm text-slate-400">Archive shows after closing. Mock: 2026 → August Closed, September Open.</p> :
                Object.entries(archive).map(([y, months])=> (
                  <div key={y}>
                    <p className="text-xs font-semibold">2026</p>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {(months as Array<{month:number; name:string; status:string}>).map(m=> (
                        <div key={m.month} className={`rounded-xl border p-2 text-xs ${m.status==="Closed"?"bg-emerald-50 border-emerald-200":"bg-slate-50"}`}>
                          <p className="font-medium">{m.name} {m.status==="Closed"?"✓":"○"}</p>
                          {m.status==="Closed"? (
                            <div className="flex gap-2 mt-1">
                              <a href={`/api/statements/mock?format=pdf`} target="_blank" className="rounded-full bg-white border border-slate-200 px-2 py-1">PDF</a>
                              <a href={`/api/statements/mock?format=csv`} target="_blank" className="rounded-full bg-white border border-slate-200 px-2 py-1">CSV</a>
                            </div>
                          ): <span className="text-slate-400">Open</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {/* Also show raw statements */}
              <div className="mt-3 space-y-2">
                {statements.map((s:Statement)=> (
                  <div key={s.id} className="rounded-xl border border-slate-200 p-3 text-xs flex justify-between">
                    <span>{(s as unknown as Record<string,unknown>).year? `${(s as unknown as Record<string,unknown>).year}-${String((s as unknown as Record<string,unknown>).month).padStart(2,"0")}`: s.id} • {s.status || "Generated"}</span>
                    <span className="flex gap-2">
                      <a href={`/api/statements/${s.id}?format=pdf`} target="_blank" className="underline text-emerald-700">PDF</a>
                      <a href={`/api/statements/${s.id}?format=csv`} target="_blank" className="underline">CSV</a>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs">
          <p className="font-semibold">Email System (Phase 14)</p>
          <p>Sends via Resend to business <code className="bg-white px-1 rounded">statementEmail</code> (fallback business email). Settings in <Link href="/settings/business" className="underline">Business Settings → toggle monthlyStatementEnabled</Link>. Logs at <a href="/api/email" target="_blank" className="underline">/api/email</a> with retry count. Failed → notification + retry. Mocked until RESEND_API_KEY set.</p>
        </div>
      </main>
    </div>
  );
}
