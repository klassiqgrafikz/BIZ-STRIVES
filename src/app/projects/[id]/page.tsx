"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatMoney } from "@/lib/currency";

export default function ProjectDetail(){
  const {id}=useParams<{id:string}>();
  const [data,setData]=useState<{project:Record<string,unknown>; outstanding:number} | null>(null);
  useEffect(()=>{ fetch(`/api/projects/${id}`).then(r=>r.json()).then(setData); },[id]);
  if(!data) return <div className="min-h-screen flex items-center justify-center text-sm">Loading…</div>;
  const p=data.project as Record<string,string>;
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex justify-between"><h1 className="font-bold">{p.name as string}</h1><Link href="/projects" className="text-xs border border-slate-200 rounded-full px-3 py-1">← Projects</Link></div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-6 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm"><span className="text-slate-500">Customer:</span> {(p.customerName as string) || "—"}</p>
          <p className="text-sm"><span className="text-slate-500">Status:</span> {p.status as string}</p>
          <p className="text-sm"><span className="text-slate-500">Agreed:</span> {formatMoney(Number(p.agreedAmount),"NGN")} • Paid: {formatMoney(Number(p.amountPaid),"NGN")} • <strong className={data.outstanding>0?"text-red-600":"text-emerald-600"}>Outstanding: {formatMoney(data.outstanding,"NGN")}</strong></p>
          <p className="text-xs text-slate-500 mt-2">{p.description as string}</p>
        </div>
        <Link href="/invoices" className="block rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">Create invoice for this project →</Link>
      </main>
    </div>
  );
}
