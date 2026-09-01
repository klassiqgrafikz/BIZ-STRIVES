"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatMoney } from "@/lib/currency";

export default function InvoiceDetail(){
  const {id}=useParams<{id:string}>();
  const [inv,setInv]=useState<Record<string,unknown>|null>(null);
  const [pay,setPay]=useState({amount:0, date:new Date().toISOString().slice(0,10)});

  async function load(){ const r=await fetch(`/api/invoices/${id}`).then(x=>x.json()); if(r.invoice) setInv(r.invoice); }
  useEffect(()=>{load();},[id]);

  async function act(body:Record<string,unknown>){
    const r=await fetch(`/api/invoices/${id}`,{method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)});
    const j=await r.json();
    if(!r.ok) alert(j.error?String(j.error).slice(0,400):"Error");
    else load();
  }

  if(!inv) return <div className="min-h-screen flex items-center justify-center text-sm">Loading…</div>;
  const total=Number(inv.total as string); const paid=Number(inv.amountPaid as string); const due=Number(inv.balanceDue as string);
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex justify-between"><h1 className="font-bold">{String(inv.invoiceNumber)} <span className="text-xs font-normal text-slate-500">• {String(inv.status)}</span></h1><Link href="/invoices" className="text-xs border border-slate-200 rounded-full px-3 py-1">← Invoices</Link></div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-6 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm"><span className="text-slate-500">Customer:</span> {String((inv.customerName as string) || "—")}</p>
          <p className="text-sm"><span className="text-slate-500">Date:</span> {String(inv.invoiceDate).slice(0,10)} • Due: {String(inv.dueDate||"—").slice(0,10)}</p>
          <p className="mt-2 text-sm">Subtotal / Discount / Tax already computed. <strong>Total: {formatMoney(total,"NGN")}</strong></p>
          <p className="text-sm">Paid: {formatMoney(paid,"NGN")} • Due: <strong className={due>0?"text-red-600":"text-emerald-600"}>{formatMoney(due,"NGN")}</strong></p>
          <div className="mt-3">
            <h4 className="text-xs font-semibold">Items</h4>
            <ul className="text-sm mt-1">
              {(inv.items as Array<Record<string,unknown>>)?.map((it,i)=> (
                <li key={i} className="flex justify-between border-b border-slate-100 py-1"><span>{String(it.description)} × {String(it.quantity)}</span><span>{formatMoney(Number(it.amount as string),"NGN")}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>act({status:"Sent"})} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs">Mark Sent</button>
            <button onClick={()=>act({status:"Paid"})} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Mark Paid</button>
            <button onClick={()=>act({duplicate:true})} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs">Duplicate</button>
            <button onClick={()=>window.print()} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs">Print / Save PDF (browser)</button>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-medium">Record payment (also creates INCOME + updates project paid)</p>
            <div className="mt-2 flex gap-2">
              <input type="number" step="0.01" value={pay.amount} onChange={e=>setPay({...pay,amount:Number(e.target.value)})} placeholder="Amount" className="rounded-xl border border-slate-200 px-3 py-2 text-sm flex-1" />
              <input type="date" value={pay.date} onChange={e=>setPay({...pay,date:e.target.value})} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={()=>act({recordPayment:{amount:pay.amount, date:pay.date}})} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Record</button>
            </div>
          </div>
          <p className="text-xs text-slate-500">V1 manual sending — online payment links added later (Phase 8 Future). PDF generation is browser print for V1; server PDF via Vercel in next iteration.</p>
        </div>
      </main>
    </div>
  );
}
