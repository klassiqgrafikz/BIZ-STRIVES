"use client";
import { useState } from "react";
import Link from "next/link";

type Result = {id:string; type:string; title:string; subtitle:string; href:string};

export default function SearchPage(){
  const [q,setQ]=useState("");
  const [type,setType]=useState("");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [results,setResults]=useState<Result[]>([]);
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState<string|null>(null);

  async function search(){
    if(!q && !type && !from) { setMsg("Enter a query or filter"); return; }
    setLoading(true); setMsg(null);
    const params=new URLSearchParams();
    if(q) params.set("q",q);
    if(type) params.set("type",type);
    if(from) params.set("from",from);
    if(to) params.set("to",to);
    const r=await fetch(`/api/search?${params.toString()}`).then(x=>x.json());
    if(r.results) setResults(r.results);
    if(r.results?.length===0) setMsg("No results. Try different keywords or check spelling.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Search <span className="text-xs font-normal text-slate-500">— Phase 20 • customers, projects, invoices, transactions, statements</span></h1>
          <Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link>
        </div>
        <div className="mx-auto max-w-4xl px-6 pb-4 space-y-3">
          <div className="flex gap-2">
            <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="Global search — e.g., John, INV-001, Website, Hosting" className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
            <button onClick={search} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white">Search</button>
          </div>
          <div className="flex gap-2 overflow-auto text-xs">
            <select value={type} onChange={e=>setType(e.target.value)} className="rounded-full border border-slate-200 px-3 py-1.5 bg-white">
              <option value="">All types</option>
              <option value="customer">Customers</option><option value="project">Projects</option><option value="invoice">Invoices</option><option value="transaction">Transactions</option><option value="statement">Statements</option>
            </select>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-full border border-slate-200 px-3 py-1.5" placeholder="From" />
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-full border border-slate-200 px-3 py-1.5" placeholder="To" />
            <span className="ml-auto hidden sm:inline text-slate-400 py-1.5">Filters: date • type • category • account • currency • amount range</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-6 space-y-6">
        {msg && <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">{msg}</p>}
        {loading? <p className="text-sm text-slate-500">Searching…</p> :
          results.length>0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold">{results.length} results {q?`for “${q}”`:""}</h3>
              <ul className="mt-3 divide-y divide-slate-100">
                {results.map(r=> (
                  <li key={`${r.type}-${r.id}`} className="flex justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{r.title} <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs ml-2">{r.type}</span></p>
                      <p className="text-xs text-slate-500">{r.subtitle}</p>
                    </div>
                    <Link href={r.href as never} className="text-xs font-medium text-emerald-700 hover:underline self-center">Open →</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Data Export</h3>
          <p className="text-xs text-slate-500">CSV • PDF — Excel future. Filtered or full export.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
            <a href={`/api/exports?entity=transactions&format=csv&from=${from}&to=${to}`} target="_blank" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center hover:bg-white">
              <span className="font-semibold">Export Transactions — CSV</span><br /><span className="text-xs text-slate-500">Date-filtered if set</span>
            </a>
            <a href={`/api/exports?entity=customers&format=csv`} target="_blank" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center hover:bg-white">
              <span className="font-semibold">Export Customers — CSV</span><br /><span className="text-xs text-slate-500">Full list</span>
            </a>
            <a href={`/api/exports?entity=transactions&format=pdf&from=${from}&to=${to}`} target="_blank" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
              <span className="font-semibold">Export Transactions — PDF (HTML)</span><br /><span className="text-xs text-slate-500">Print-ready</span>
            </a>
            <a href={`/api/statements/mock?format=csv`} target="_blank" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
              <span className="font-semibold">Statement CSV</span><br /><span className="text-xs text-slate-500">From archive</span>
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-3">Users can export financial data any time. Future: Excel via <code className="bg-slate-100 px-1 rounded">exceljs</code>.</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs">
          <p className="font-semibold">Search & filters</p>
          <p>Global search scans customers, projects, invoices, transactions, statements. Filters: date, type, category, account, customer, project, currency, amount range — wired to DB where available, mocked otherwise.</p>
        </div>
      </main>
    </div>
  );
}
