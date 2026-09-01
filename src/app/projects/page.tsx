"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

type Customer = {id:string; fullName:string};
type Project = {id:string; name:string; customerName?:string; customer?:{fullName:string}; serviceType?:string; status:string; agreedAmount:string; amountPaid:string; currency:string};

export default function ProjectsPage(){
  const [projects,setProjects]=useState<Project[]>([]);
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({customerId:"", name:"", serviceType:"Website Development", description:"", startDate:"", dueDate:"", agreedAmount:0, currency:"NGN", status:"Draft"});

  async function load(){
    setLoading(true);
    const [p,c]=await Promise.all([fetch("/api/projects").then(r=>r.json()), fetch("/api/customers").then(r=>r.json())]);
    if(p.projects) setProjects(p.projects);
    if(c.customers) setCustomers(c.customers);
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  async function add(e:React.FormEvent){
    e.preventDefault();
    const r=await fetch("/api/projects",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, agreedAmount:Number(form.agreedAmount)})});
    const j=await r.json();
    if(!r.ok) alert(j.error?String(j.error).slice(0,400):"Error");
    else { setShowAdd(false); load(); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Projects <span className="text-xs font-normal text-slate-500">— Phase 7 • linked to customers & invoices</span></h1>
          <div className="flex gap-2">
            <Link href="/customers" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Customers</Link>
            <Link href="/invoices" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Invoices →</Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 flex justify-between">
          <p className="text-xs text-slate-500">Outstanding = agreed − paid. Payments feed income.</p>
          <button onClick={()=>setShowAdd(!showAdd)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{showAdd?"Cancel":"+ Add Project"}</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        {showAdd && (
          <form onSubmit={add} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="text-xs font-medium">Customer *</span>
                <select value={form.customerId} onChange={e=>setForm({...form,customerId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required>
                  <option value="">Select customer</option>{customers.map(c=> <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Project name *</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required /></label>
              <label className="block"><span className="text-xs font-medium">Service type</span>
                <select value={form.serviceType} onChange={e=>setForm({...form,serviceType:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["Website Development","Graphic Design","Branding","Video Editing","Photography","Consulting","Other Services"].map(s=> <option key={s}>{s}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Status</span>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["Draft","Active","Completed","Cancelled","OnHold"].map(s=> <option key={s}>{s}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Agreed amount * (NGN)</span><input type="number" step="0.01" value={form.agreedAmount} onChange={e=>setForm({...form,agreedAmount:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required /></label>
              <label className="block"><span className="text-xs font-medium">Currency</span><select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">{["NGN","USD","EUR","GBP"].map(c=> <option key={c}>{c}</option>)}</select></label>
              <label className="block"><span className="text-xs font-medium">Start date</span><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Due date</span><input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block sm:col-span-2"><span className="text-xs font-medium">Description</span><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
            </div>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create project</button>
          </form>
        )}
        {loading? <p className="text-sm text-slate-500">Loading…</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(p=> {
              const outstanding = Number(p.agreedAmount) - Number(p.amountPaid);
              return (
                <Link key={p.id} href={`/projects/${p.id}` as never} className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-semibold">{p.name}</h3>
                    <span className={`rounded-full px-2 py-1 text-xs border ${p.status==="Active"?"bg-emerald-50 border-emerald-200 text-emerald-700":p.status==="Completed"?"bg-blue-50 border-blue-200":"bg-slate-50"}`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">{p.customerName || p.customer?.fullName || "—"} • {p.serviceType || "—"}</p>
                  <p className="mt-2 text-sm">Agreed: <strong>{formatMoney(Number(p.agreedAmount), p.currency)}</strong></p>
                  <p className="text-xs">Paid: {formatMoney(Number(p.amountPaid), p.currency)} • <span className={outstanding>0?"text-red-600":"text-emerald-600"}>Due: {formatMoney(outstanding, p.currency)}</span></p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
