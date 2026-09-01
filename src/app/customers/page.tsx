"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Customer = { id:string; fullName:string; email?:string; phone?:string; company?:string; birthday?:string; address?:string; notes?:string };

export default function CustomersPage(){
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [q,setQ]=useState("");
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({fullName:"", email:"", phone:"", company:"", birthday:"", address:"", notes:""});

  async function load(){
    setLoading(true);
    const r=await fetch(`/api/customers${q?`?q=${encodeURIComponent(q)}`:""}`);
    const j=await r.json();
    if(j.customers) setCustomers(j.customers);
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  async function add(e:React.FormEvent){
    e.preventDefault();
    const r=await fetch("/api/customers",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form)});
    const j=await r.json();
    if(!r.ok) alert(j.error?String(j.error).slice(0,400):"Error");
    else { setShowAdd(false); setForm({fullName:"", email:"", phone:"", company:"", birthday:"", address:"", notes:""}); load(); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Customers <span className="text-xs font-normal text-slate-500">— Phase 6 • DB-ready • searchable</span></h1>
          <div className="flex gap-2">
            <Link href="/projects" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Projects →</Link>
            <Link href="/invoices" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Invoices →</Link>
            <Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()} placeholder="Search name / email / phone / company" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button onClick={load} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">Search</button>
          <button onClick={()=>setShowAdd(!showAdd)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{showAdd?"Cancel":"+ Add Customer"}</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        {showAdd && (
          <form onSubmit={add} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="text-xs font-medium">Full name *</span><input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required /></label>
              <label className="block"><span className="text-xs font-medium">Email</span><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Phone</span><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="+234..." /></label>
              <label className="block"><span className="text-xs font-medium">Company</span><input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Birthday</span><input type="date" value={form.birthday} onChange={e=>setForm({...form,birthday:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Address</span><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
            </div>
            <label className="block"><span className="text-xs font-medium">Notes</span><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create customer</button>
            <p className="text-xs text-slate-500">Birthday stored for automation (Phase 18). Use for future greeting campaigns.</p>
          </form>
        )}

        {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customers.map(c=> (
              <Link key={c.id} href={`/customers/${c.id}` as never} className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow">
                <h3 className="text-sm font-semibold">{c.fullName}</h3>
                <p className="text-xs text-slate-500">{c.company || "—"} • {c.email || "no email"}</p>
                <p className="text-xs text-slate-500">{c.phone || "—"} {c.birthday? `• 🎂 ${c.birthday.slice(5)}`:""}</p>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{c.notes || c.address || "No notes"}</p>
                <span className="mt-3 inline-block text-xs font-medium text-emerald-700">View → stats/payments</span>
              </Link>
            ))}
          </div>
        )}
        {customers.length===0 && !loading && <p className="text-center text-sm text-slate-400 py-10">No customers yet. Add one.</p>}
      </main>
    </div>
  );
}
