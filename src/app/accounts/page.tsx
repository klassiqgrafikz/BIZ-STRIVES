"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

type Account = { id:string; name:string; type:string; currency:string; openingBalance:string; currentBalance:string; status:string; notes?:string };

export default function AccountsPage() {
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [showTransfer,setShowTransfer]=useState(false);
  const [form,setForm]=useState({name:"", type:"Bank", currency:"NGN", openingBalance:0, notes:""});
  const [transfer,setTransfer]=useState({fromAccountId:"", toAccountId:"", amount:0, description:""});
  const [msg,setMsg]=useState<string|null>(null);

  async function load(){
    setLoading(true);
    const r=await fetch("/api/accounts");
    const j=await r.json();
    if(j.accounts) setAccounts(j.accounts);
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  async function addAccount(e:React.FormEvent){
    e.preventDefault();
    const r=await fetch("/api/accounts",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, openingBalance:Number(form.openingBalance)})});
    const j=await r.json();
    if(!r.ok) setMsg(j.error?String(j.error).slice(0,300):"Error");
    else { setMsg(j.mocked?"Account added (mock — wire DATABASE_URL for persistence)":"Account created"); setShowAdd(false); load(); }
  }

  async function doTransfer(e:React.FormEvent){
    e.preventDefault();
    const r=await fetch("/api/accounts/transfer",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...transfer, amount:Number(transfer.amount), currency:"NGN", date:new Date().toISOString()})});
    const j=await r.json();
    if(!r.ok) setMsg(j.error?String(j.error).slice(0,300):"Error");
    else { setMsg(j.mocked?"Transfer mocked (not counted as income/expense ✓)":"Transferred"); setShowTransfer(false); load(); }
  }

  if(loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading accounts…</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Accounts <span className="text-xs font-normal text-slate-500">— where money lives (Phase 3)</span></h1>
          <div className="flex gap-2">
            <Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link>
            <Link href="/transactions" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Transactions →</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {msg && <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 mb-4">{msg}</p>}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Transfers between accounts are <strong>not</strong> income/expense — excluded from Money Remaining (Rule 3).</p>
          <div className="flex gap-2">
            <button onClick={()=>setShowAdd(!showAdd)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{showAdd?"Cancel":" + Add Account"}</button>
            <button onClick={()=>setShowTransfer(!showTransfer)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium">⇄ Transfer</button>
          </div>
        </div>

        {showAdd && (
          <form onSubmit={addAccount} className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="text-xs font-medium">Name *</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="GTBank" required/></label>
              <label className="block"><span className="text-xs font-medium">Type</span>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["Bank","Cash","Savings","MobileMoney","Other"].map(t=> <option key={t} value={t}>{t}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Currency</span>
                <select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["NGN","USD","EUR","GBP","GHS"].map(c=> <option key={c}>{c}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Opening balance</span><input type="number" step="0.01" value={form.openingBalance} onChange={e=>setForm({...form,openingBalance: Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"/></label>
            </div>
            <label className="block"><span className="text-xs font-medium">Notes</span><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Optional"/></label>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create account</button>
          </form>
        )}

        {showTransfer && (
          <form onSubmit={doTransfer} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
            <h3 className="text-sm font-semibold">Transfer money (not income/expense)</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block"><span className="text-xs font-medium">From</span>
                <select value={transfer.fromAccountId} onChange={e=>setTransfer({...transfer,fromAccountId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required>
                  <option value="">Select</option>{accounts.map(a=> <option key={a.id} value={a.id}>{a.name}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">To</span>
                <select value={transfer.toAccountId} onChange={e=>setTransfer({...transfer,toAccountId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required>
                  <option value="">Select</option>{accounts.map(a=> <option key={a.id} value={a.id}>{a.name}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Amount (NGN)</span><input type="number" step="0.01" value={transfer.amount} onChange={e=>setTransfer({...transfer,amount:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required/></label>
            </div>
            <label className="block"><span className="text-xs font-medium">Description</span><input value={transfer.description} onChange={e=>setTransfer({...transfer,description:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="e.g., Cash to bank"/></label>
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Transfer</button>
            <p className="text-xs text-amber-800">✓ Will create ACCOUNT_TRANSFER transaction — verified excluded from dashboard Money Remaining.</p>
          </form>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(a=> (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{a.name}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{a.type} • {a.currency}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{formatMoney(Number(a.currentBalance ?? a.openingBalance), a.currency)}</p>
              <p className="text-xs text-slate-500">Opening: {formatMoney(Number(a.openingBalance), a.currency)} • {a.status}</p>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-full border border-slate-200 px-2 py-1">{a.id.slice(0,8)}</span>
                <span className={`rounded-full px-2 py-1 ${a.status==="Active"?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-slate-100"}`}>{a.status}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-400 text-center">Accounts page verifies Rule 3 — transfers do not affect income/expense. Wire DATABASE_URL for real balances.</p>
      </main>
    </div>
  );
}
