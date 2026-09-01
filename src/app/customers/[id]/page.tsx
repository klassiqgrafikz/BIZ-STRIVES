"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatMoney } from "@/lib/currency";

export default function CustomerDetail(){
  const {id}=useParams<{id:string}>();
  const [data,setData]=useState<{customer:Record<string,unknown>; stats:{totalReceived:number; projectCount:number; invoiceCount:number; outstanding:number}; projects:Array<Record<string,unknown>>; invoices:Array<Record<string,unknown>>} | null>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ fetch(`/api/customers/${id}`).then(r=>r.json()).then(setData).finally(()=>setLoading(false)); },[id]);
  if(loading) return <div className="min-h-screen flex items-center justify-center text-sm">Loading…</div>;
  if(!data) return <div className="p-6">Not found</div>;
  const c = data.customer as Record<string,string>;
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">{c.fullName} <span className="text-xs font-normal text-slate-500">• Customer profile</span></h1>
          <Link href="/customers" className="rounded-full border border-slate-200 px-3 py-1 text-xs">← Customers</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Contact</h3>
          <div className="mt-2 grid gap-2 text-sm">
            <p><span className="text-slate-500">Email:</span> {c.email || "—"}</p>
            <p><span className="text-slate-500">Phone:</span> {c.phone || "—"}</p>
            <p><span className="text-slate-500">Company:</span> {c.company || "—"}</p>
            <p><span className="text-slate-500">Birthday:</span> {c.birthday || "—"} {c.birthday?"• used for automation":""}</p>
            <p><span className="text-slate-500">Address:</span> {c.address || "—"}</p>
            <p className="text-xs text-slate-500">{String(c.notes||"")}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs text-slate-500">Total received</p><p className="text-lg font-bold">{formatMoney(data.stats.totalReceived,"NGN")}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Projects</p><p className="text-lg font-bold">{data.stats.projectCount}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Invoices</p><p className="text-lg font-bold">{data.stats.invoiceCount}</p></div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-xs text-slate-500">Outstanding</p><p className="text-lg font-bold text-red-600">{formatMoney(data.stats.outstanding,"NGN")}</p></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Projects</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {data.projects.length===0? <li className="text-xs text-slate-400">No projects</li> : data.projects.map((p:Record<string,unknown>)=> (
              <li key={String(p.id)} className="flex justify-between border-b border-slate-100 py-2"><span>{String(p.name)} • {String(p.status)}</span><span>{formatMoney(Number(p.agreedAmount),"NGN")} (paid {formatMoney(Number(p.amountPaid),"NGN")})</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Invoices</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {data.invoices.length===0? <li className="text-xs text-slate-400">No invoices</li> : data.invoices.map((inv:Record<string,unknown>)=> (
              <li key={String(inv.id)} className="flex justify-between border-b border-slate-100 py-2"><span>{String(inv.invoiceNumber)} • {String(inv.status)}</span><span>{formatMoney(Number(inv.total),"NGN")} due {formatMoney(Number(inv.balanceDue),"NGN")}</span></li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
