"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";
import { calculatePeriodTotals } from "@/lib/finance/calculations";

type Tx = { id:string; type:string; amount:string; currency:string; exchangeRate:string; baseAmount:string; date:string; description?:string; categoryId?:string; accountId?:string };
type Cat = { id:string; type:string; name:string };
type Acc = { id:string; name:string; currency:string };

export default function TransactionsPage() {
  const [tab,setTab]=useState<"ALL"|"INCOME"|"BUSINESS_EXPENSE"|"PERSONAL_SPENDING"|"ACCOUNT_TRANSFER"|"SAVINGS_ALLOCATION">("ALL");
  const [txs,setTxs]=useState<Tx[]>([]);
  const [cats,setCats]=useState<Cat[]>([]);
  const [accs,setAccs]=useState<Acc[]>([]);
  const [totals,setTotals]=useState<ReturnType<typeof calculatePeriodTotals> | null>(null);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [currSuggest,setCurrSuggest]=useState<string>("NGN");
  const [form,setForm]=useState({type:"INCOME", amount:0, currency:"NGN", exchangeRate:1, date:new Date().toISOString().slice(0,10), categoryId:"", accountId:"", description:""});

  async function load(){
    setLoading(true);
    const q = tab==="ALL" ? "" : `?type=${tab}`;
    const [rT,rC,rA,rCurr]=await Promise.all([
      fetch(`/api/transactions${q}`).then(x=>x.json()),
      fetch(`/api/categories`).then(x=>x.json()),
      fetch(`/api/accounts`).then(x=>x.json()),
      fetch(`/api/currencies?detect=1`).then(x=>x.json()).catch(()=>({suggestedCurrency:"NGN"})),
    ]);
    if(rT.transactions) { setTxs(rT.transactions); if(rT.totals) setTotals(rT.totals); else {
      // compute via engine for mock that didn't provide totals
      setTotals(calculatePeriodTotals(rT.transactions.map((t:Tx)=>({type:t.type as never, amount:Number(t.amount), baseAmount:Number(t.baseAmount), date:new Date(t.date)}))));
    }}
    if(rC.categories) setCats(rC.categories);
    if(rA.accounts) setAccs(rA.accounts);
    if(rCurr.suggestedCurrency) setCurrSuggest(rCurr.suggestedCurrency);
    setLoading(false);
  }
  useEffect(()=>{ load(); },[tab]);

  async function addTx(e:React.FormEvent){
    e.preventDefault();
    const r=await fetch("/api/transactions",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, amount:Number(form.amount), exchangeRate:Number(form.exchangeRate), currency:form.currency.toUpperCase()})});
    const j=await r.json();
    if(!r.ok) alert(j.error?String(j.error).slice(0,400):"Error");
    else { setShowAdd(false); load(); }
  }

  const filteredCats = cats.filter(c=> {
    if(form.type==="INCOME") return c.type==="INCOME";
    if(form.type==="BUSINESS_EXPENSE") return c.type==="BUSINESS_EXPENSE";
    if(form.type==="PERSONAL_SPENDING") return c.type==="PERSONAL_SPENDING";
    return true;
  });

  if(loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading transactions…</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Transactions <span className="text-xs font-normal text-slate-500">— core engine (Rule 1-3) • currency + date aware</span></h1>
          <div className="flex gap-2">
            <Link href="/accounts" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Accounts</Link>
            <Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 flex gap-2 overflow-auto">
          {(["ALL","INCOME","BUSINESS_EXPENSE","PERSONAL_SPENDING","ACCOUNT_TRANSFER","SAVINGS_ALLOCATION"] as const).map(t=> (
            <button key={t} onClick={()=>setTab(t)} className={`rounded-full px-3 py-1 text-xs font-medium border ${tab===t?"bg-emerald-600 text-white border-emerald-600":"bg-white border-slate-200"}`}>{t.replaceAll("_"," ")}</button>
          ))}
          <span className="ml-auto text-xs text-slate-500 hidden sm:inline">Suggested currency: <strong>{currSuggest}</strong> (location detect — never mutates history)</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {totals && (
          <div className="grid gap-3 sm:grid-cols-4 mb-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs text-slate-500">Money In</p><p className="text-lg font-bold">{formatMoney(totals.totalIncome,"NGN")}</p></div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-xs text-slate-500">Biz Expenses</p><p className="text-lg font-bold text-red-600">-{formatMoney(totals.businessExpenses,"NGN")}</p></div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs text-slate-500">Personal</p><p className="text-lg font-bold text-orange-600">-{formatMoney(totals.personalSpending,"NGN")}</p></div>
            <div className="rounded-2xl border-2 border-emerald-300 bg-white p-4"><p className="text-xs text-slate-500">Money Remaining</p><p className="text-lg font-bold text-emerald-700">{formatMoney(totals.moneyRemaining,"NGN")}</p><p className="text-xs text-emerald-600">Available: {formatMoney(totals.availableMoney,"NGN")}</p></div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">{txs.length} transactions • {tab} • <Link href="/api/currencies" className="underline">currencies</Link></p>
          <button onClick={()=>setShowAdd(!showAdd)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{showAdd?"Cancel":"+ Add Transaction"}</button>
        </div>

        {showAdd && (
          <form onSubmit={addTx} className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block"><span className="text-xs font-medium">Type *</span>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value, categoryId:""})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["INCOME","BUSINESS_EXPENSE","PERSONAL_SPENDING","SAVINGS_ALLOCATION","SAVINGS_WITHDRAWAL","ACCOUNT_TRANSFER","OTHER"].map(t=> <option key={t}>{t}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Amount *</span><input type="number" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required/></label>
              <label className="block"><span className="text-xs font-medium">Currency</span>
                <select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["NGN","USD","EUR","GBP","GHS","KES","ZAR","CAD"].map(c=> <option key={c}>{c}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Exchange rate</span><input type="number" step="0.000001" value={form.exchangeRate} onChange={e=>setForm({...form,exchangeRate:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" title="1 = base NGN per unit. e.g., USD 1500"/></label>
              <label className="block"><span className="text-xs font-medium">Date *</span><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required/></label>
              <label className="block"><span className="text-xs font-medium">Category</span>
                <select value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">— none —</option>
                  {filteredCats.slice(0,20).map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Account</span>
                <select value={form.accountId} onChange={e=>setForm({...form,accountId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">— none —</option>
                  {accs.map(a=> <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                </select></label>
              <label className="block sm:col-span-2"><span className="text-xs font-medium">Description</span><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="e.g., Client payment, Office rent"/></label>
            </div>
            <p className="text-xs text-slate-500">Rule 8: currency stored per-transaction. Base = amount × rate (e.g., $500×1500=₦750k). Savings/transfers excluded from Money Remaining.</p>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Save transaction</button>
          </form>
        )}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Description</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-left">Currency</th><th className="px-4 py-2 text-left">Account</th></tr>
            </thead>
            <tbody>
              {txs.length===0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No transactions for this filter. Add one above.</td></tr>}
              {txs.map(t=> (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 text-xs">{new Date(t.date).toISOString().slice(0,10)}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-1 text-xs border ${t.type==="INCOME"?"bg-emerald-50 border-emerald-200 text-emerald-700":t.type==="BUSINESS_EXPENSE"?"bg-red-50 border-red-200 text-red-700":t.type==="PERSONAL_SPENDING"?"bg-orange-50 border-orange-200 text-orange-700":t.type==="ACCOUNT_TRANSFER"?"bg-slate-100 border-slate-200":"bg-blue-50 border-blue-200"}`}>{t.type}</span></td>
                  <td className="px-4 py-2">{t.description || "—"}</td>
                  <td className="px-4 py-2 text-right font-medium">{t.type==="BUSINESS_EXPENSE"||t.type==="PERSONAL_SPENDING"?"-":""}{formatMoney(Number(t.amount), t.currency)}</td>
                  <td className="px-4 py-2 text-xs">{t.currency} {t.currency!=="NGN" && `(base ${formatMoney(Number(t.baseAmount),"NGN")})`}</td>
                  <td className="px-4 py-2 text-xs">{t.accountId?.slice(0,8) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-2 text-xs text-slate-500">
          <span>Filter:</span>
          {["today","thisMonth","lastMonth","thisYear"].map(p=> (
            <button key={p} onClick={async()=>{ const r=await fetch(`/api/transactions?period=${p}`).then(x=>x.json()); if(r.transactions) { setTxs(r.transactions); if(r.totals) setTotals(r.totals); setTab("ALL"); }}} className="rounded-full border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50">{p}</button>
          ))}
          <span className="ml-auto">Date-filter reconstructs from individual transactions (Rule 5).</span>
        </div>
      </main>
    </div>
  );
}
