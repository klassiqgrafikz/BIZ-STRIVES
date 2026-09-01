"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Biz = { id:string; name:string; slug:string; email?:string; phone?:string; address?:string; description?:string; timezone:string; baseCurrency:string; dateFormat:string; logoUrl?:string; statementEmail?:string; monthlyStatementEnabled?:boolean; statementTime?:string };

export default function BusinessSettingsPage() {
  const [biz, setBiz] = useState<Biz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/businesses");
      const j = await r.json();
      if (j.businesses?.[0]) {
        const id = j.businesses[0].id;
        const d = await fetch(`/api/businesses/${id}`).then(x=>x.json());
        setBiz(d.business);
      }
    } catch (e) { setErr(String(e)); } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!biz) return;
    setSaving(true); setErr(null); setMsg(null);
    try {
      const r = await fetch(`/api/businesses/${biz.id}`, { method:"PUT", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(biz)});
      const j = await r.json();
      if (!r.ok) setErr(String(j.error).slice(0,400));
      else { setMsg("Saved. Audit-logged."); setBiz(j.business || biz); }
      if (j.mocked) setMsg("Mocked save (DB not configured) — wire DATABASE_URL for persistence");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading business…</div>;
  if (!biz) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm">No business found. <Link href="/signup" className="underline text-emerald-700">Create one</Link></p></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Business Settings</h1>
          <Link href="/dashboard" className="text-xs font-medium text-emerald-700 hover:underline">← Dashboard</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold">Workspace Profile</h2>
          <p className="text-xs text-slate-500">Configurable — initial is Klassiq Grafikz but platform stays generic. Future: multiple businesses per user.</p>
          <form onSubmit={save} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="text-xs font-medium">Business name *</span><input value={biz.name} onChange={e=>setBiz({...biz, name:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required /></label>
              <label className="block"><span className="text-xs font-medium">Slug (read-only)</span><input value={biz.slug} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Email</span><input value={biz.email||""} onChange={e=>setBiz({...biz,email:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="hello@klassiqgrafikz.com" /></label>
              <label className="block"><span className="text-xs font-medium">Phone</span><input value={biz.phone||""} onChange={e=>setBiz({...biz,phone:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="+234 ..." /></label>
              <label className="block sm:col-span-2"><span className="text-xs font-medium">Address</span><input value={biz.address||""} onChange={e=>setBiz({...biz,address:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Lagos, Nigeria" /></label>
              <label className="block sm:col-span-2"><span className="text-xs font-medium">Description</span><textarea value={biz.description||""} onChange={e=>setBiz({...biz,description:e.target.value})} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Logo URL</span><input value={biz.logoUrl||""} onChange={e=>setBiz({...biz,logoUrl:e.target.value})} placeholder="https://..." className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Base currency</span>
                <select value={biz.baseCurrency} onChange={e=>setBiz({...biz, baseCurrency:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["NGN","USD","EUR","GBP","GHS","KES","ZAR","CAD"].map(c=><option key={c} value={c}>{c}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Timezone</span>
                <select value={biz.timezone} onChange={e=>setBiz({...biz, timezone:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="Africa/Lagos">Africa/Lagos</option><option value="Africa/Accra">Africa/Accra</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option><option value="UTC">UTC</option>
                </select></label>
              <label className="block"><span className="text-xs font-medium">Date format</span>
                <select value={biz.dateFormat} onChange={e=>setBiz({...biz, dateFormat:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select></label>
              <label className="block"><span className="text-xs font-medium">Statement email (Phase 14)</span><input value={(biz as Biz).statementEmail||""} onChange={e=>setBiz({...biz, statementEmail:e.target.value})} placeholder="statements@yourdomain.com" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Monthly statement</span>
                <select value={String((biz as Biz).monthlyStatementEnabled ?? true)} onChange={e=>setBiz({...biz, monthlyStatementEnabled: e.target.value==="true"})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="true">Enabled — auto email last day</option><option value="false">Disabled</option>
                </select></label>
            </div>
            {err && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</p>}
            {msg && <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{saving?"Saving…":"Save changes"}</button>
              <Link href="/dashboard" className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancel</Link>
            </div>
            <p className="text-xs text-slate-400">Changes audit-logged. Roles: Owner/Admin can edit. Mocked if DATABASE_URL not set.</p>
          </form>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-xs">
          <p className="font-semibold">Email & Automation (Phase 14)</p>
          <p className="mt-1">Monthly statement email sent on last day at <code className="bg-slate-100 px-1 rounded">22:00 UTC (~23:00 Lagos)</code> via <code className="bg-slate-100 px-1 rounded">vercel.json</code> cron → <code className="bg-slate-100 px-1 rounded">RESEND_API_KEY</code>. Logs at <a href="/api/email" target="_blank" className="underline">/api/email</a> • <a href="/statements" className="underline">Statements archive</a> • <a href="/notifications" className="underline">Notification center</a></p>
        </div>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-semibold">Future-ready</p>
          <p>Multiple users per business, invitations, roles — schema ready via <code className="bg-white px-1 rounded">BusinessMember.role</code>. Next phases will add UI.</p>
        </div>
      </main>
    </div>
  );
}
