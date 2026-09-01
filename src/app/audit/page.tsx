"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Log = {id:string; action:string; entity:string; entityId?:string; createdAt:string; userId?:string};

export default function AuditPage(){
  const [logs,setLogs]=useState<Log[]>([]);
  const [entity,setEntity]=useState("");
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState<string|null>(null);

  async function load(){
    setLoading(true); setErr(null);
    const r=await fetch(`/api/audit${entity?`?entity=${entity}`:""}`);
    const j=await r.json();
    if(!r.ok) setErr(j.error||"Forbidden — Owner/Admin only");
    else if(j.logs) setLogs(j.logs);
    setLoading(false);
  }
  useEffect(()=>{load();},[entity]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Audit Logs <span className="text-xs font-normal text-slate-500">— Phase 21 • Security • immutable trail</span></h1>
          <Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 flex gap-2">
          <select value={entity} onChange={e=>setEntity(e.target.value)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs bg-white">
            <option value="">All entities</option>
            <option value="User">User (login)</option><option value="Transaction">Transaction</option><option value="Invoice">Invoice</option><option value="MonthlyPeriod">MonthlyPeriod</option><option value="Automation">Automation</option><option value="Statement">Statement</option>
          </select>
          <button onClick={load} className="rounded-full border border-slate-200 px-3 py-1 text-xs">Refresh</button>
          <span className="ml-auto text-xs text-slate-400 py-1.5">HTTPS • bcrypt • JWT httpOnly • zod validation • business isolation • encrypted secrets</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6 space-y-4">
        {err? <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</p> : null}
        {loading? <p className="text-sm text-slate-500">Loading…</p> :
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-2 text-left">Time</th><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-left">Entity</th><th className="px-4 py-2 text-left">ID</th></tr></thead>
              <tbody>
                {logs.map(l=> (
                  <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2"><span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-1">{l.action}</span></td>
                    <td className="px-4 py-2">{l.entity}</td>
                    <td className="px-4 py-2 font-mono">{(l.entityId||"").slice(0,12)}</td>
                  </tr>
                ))}
                {logs.length===0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No logs for this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        }
        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold">Protected actions logged</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-slate-600">
              <li>Login / Signup / Password reset</li>
              <li>Transaction created / edited / deleted</li>
              <li>Invoice created / changed / payment recorded</li>
              <li>Month closed / reopened / reclosed</li>
              <li>Statement generated</li>
              <li>Automation created / run / toggled</li>
              <li>Business updated</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-semibold">Security posture (Vercel-unified)</h3>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>HTTPS enforced (Vercel)</li>
              <li>bcrypt 10 rounds, JWT httpOnly Secure SameSite=lax</li>
              <li>zod validation on every API route</li>
              <li>businessId isolation on all queries</li>
              <li>Secrets via env (DATABASE_URL, JWT_SECRET, RESEND_API_KEY)</li>
              <li>Never stores bank passwords/card PINs (Phase 29 abstraction)</li>
              <li>Rate limiting via Vercel WAF (enable in dashboard)</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
