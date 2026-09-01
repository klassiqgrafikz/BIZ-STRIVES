"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

type Goal = {id:string; name:string; targetAmount:string; currentAmount:string; currency:string; targetDate?:string; frequency:string; status:string; progressPct?:number; remaining?:number; notes?:string};

export default function SavingsPage(){
  const [goals,setGoals]=useState<Goal[]>([]);
  const [totalReserved,setTotalReserved]=useState(0);
  const [showAdd,setShowAdd]=useState(false);
  const [showFund,setShowFund]=useState<string|null>(null);
  const [form,setForm]=useState({name:"", targetAmount:0, currency:"NGN", targetDate:"", frequency:"Monthly", notes:""});
  const [fund,setFund]=useState({amount:0, type:"CONTRIBUTION", date:new Date().toISOString().slice(0,10), notes:""});
  const [msg,setMsg]=useState<string|null>(null);

  async function load(){
    const r=await fetch("/api/savings/goals").then(x=>x.json());
    if(r.goals){ setGoals(r.goals); setTotalReserved(r.totalReserved||0); }
  }
  useEffect(()=>{load();},[]);

  async function addGoal(e:React.FormEvent){
    e.preventDefault();
    const r=await fetch("/api/savings/goals",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, targetAmount:Number(form.targetAmount)})});
    const j=await r.json();
    if(!r.ok) alert(j.error?String(j.error).slice(0,400):"Error");
    else { setShowAdd(false); setForm({name:"", targetAmount:0, currency:"NGN", targetDate:"", frequency:"Monthly", notes:""}); load(); setMsg(j.mocked?"Goal created (mock)":"Goal created"); }
  }

  async function allocate(goalId:string){
    const r=await fetch(`/api/savings/goals/${goalId}`,{method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({allocate:{...fund, amount:Number(fund.amount), date:fund.date}})});
    const j=await r.json();
    if(!r.ok) alert(j.error?String(j.error).slice(0,400):"Error");
    else { setShowFund(null); load(); setMsg(j.mocked? j.message : "Allocation recorded"); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Savings <span className="text-xs font-normal text-slate-500">— Phase 9 • Reserved funds (not expenses) • Rule 2</span></h1>
          <div className="flex gap-2">
            <Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link>
            <Link href="/transactions" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Transactions</Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-slate-500">Reserved: </span><strong className="text-blue-600">{formatMoney(totalReserved,"NGN")}</strong>
            <span className="text-xs text-slate-500 ml-3">Available = Money Remaining − Reserved (savings never reduces business profit)</span>
          </div>
          <button onClick={()=>setShowAdd(!showAdd)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{showAdd?"Cancel":"+ New Goal"}</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        {msg && <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 mb-4">{msg} • <button onClick={()=>setMsg(null)} className="underline">dismiss</button></p>}

        {showAdd && (
          <form onSubmit={addGoal} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-2"><span className="text-xs font-medium">Goal name *</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Emergency Fund, New Laptop, Tax Reserve…" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required /></label>
              <label className="block"><span className="text-xs font-medium">Target amount (NGN) *</span><input type="number" step="0.01" value={form.targetAmount} onChange={e=>setForm({...form,targetAmount:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required /></label>
              <label className="block"><span className="text-xs font-medium">Target date</span><input type="date" value={form.targetDate} onChange={e=>setForm({...form,targetDate:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Frequency</span>
                <select value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["Daily","Weekly","Biweekly","Monthly","Custom"].map(f=> <option key={f}>{f}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Currency</span><select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">{["NGN","USD","EUR","GBP"].map(c=> <option key={c}>{c}</option>)}</select></label>
            </div>
            <label className="block"><span className="text-xs font-medium">Notes</span><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="e.g., 6 months runway" /></label>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create goal</button>
          </form>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map(g=>{
            const pct = g.progressPct ?? (Number(g.currentAmount)/Number(g.targetAmount)*100);
            const remaining = g.remaining ?? (Number(g.targetAmount)-Number(g.currentAmount));
            return (
              <div key={g.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex justify-between">
                  <h3 className="text-sm font-semibold">{g.name}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs border ${g.status==="Completed"?"bg-emerald-50 border-emerald-200 text-emerald-700":g.status==="Archived"?"bg-slate-100":"bg-blue-50 border-blue-200 text-blue-700"}`}>{g.status}</span>
                </div>
                <p className="text-xs text-slate-500">{g.frequency} • {g.targetDate? new Date(g.targetDate).toISOString().slice(0,10):"no target date"} • {g.currency}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs"><span>{formatMoney(Number(g.currentAmount), g.currency)} / {formatMoney(Number(g.targetAmount), g.currency)}</span><span className="font-semibold">{pct.toFixed(1)}%</span></div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-2 rounded-full bg-emerald-600" style={{width:`${Math.min(100,pct)}%`}} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Remaining: {formatMoney(remaining, g.currency)} {g.notes? `• ${g.notes}`:""}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={()=>setShowFund(showFund===g.id?null:g.id)} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">+ Fund</button>
                  <button onClick={()=>{setShowFund(g.id); setFund({...fund,type:"WITHDRAWAL"});}} className="rounded-full border border-slate-200 px-3 py-1 text-xs">Withdraw</button>
                  <Link href={`/savings` as never} className="ml-auto text-xs text-slate-400">{g.id.slice(0,6)}</Link>
                </div>
                {showFund===g.id && (
                  <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                    <div className="flex gap-2">
                      <select value={fund.type} onChange={e=>setFund({...fund,type:e.target.value})} className="rounded-xl border border-slate-200 px-3 py-2 text-xs">
                        <option value="CONTRIBUTION">Contribution</option><option value="WITHDRAWAL">Withdrawal</option>
                      </select>
                      <input type="number" step="0.01" value={fund.amount} onChange={e=>setFund({...fund,amount:Number(e.target.value)})} placeholder="Amount" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                    </div>
                    <div className="flex gap-2">
                      <input type="date" value={fund.date} onChange={e=>setFund({...fund,date:e.target.value})} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                      <button onClick={()=>allocate(g.id)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Save</button>
                    </div>
                    <input value={fund.notes} onChange={e=>setFund({...fund,notes:e.target.value})} placeholder="Notes" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                    <p className="text-xs text-slate-500">Weekly: upcoming contribution shown via frequency. Progress auto-updates. Reserved never affects Money Remaining.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {goals.length===0 && <p className="text-center text-sm text-slate-400 py-10">No savings goals. Create Emergency Fund, New Laptop, etc.</p>}

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs">
          <p className="font-semibold">How savings works (Rule 2)</p>
          <p className="mt-1">Example: Income 500k • Biz 100k • Personal 50k = <strong>Remaining 350k</strong>. Allocate 100k to savings → <strong>Available 250k, Reserved 100k</strong>. Savings is not an expense — dashboard formula unchanged.</p>
        </div>
      </main>
    </div>
  );
}
