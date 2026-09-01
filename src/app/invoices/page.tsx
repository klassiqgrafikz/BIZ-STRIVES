"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

type Invoice = { id:string; invoiceNumber:string; customerName?:string; customer?:{fullName:string}; total:string; amountPaid:string; balanceDue:string; status:string; dueDate?:string; invoiceDate:string };
type Customer = {id:string; fullName:string};

export default function InvoicesPage(){
  const [invoices,setInvoices]=useState<Invoice[]>([]);
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [status,setStatus]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({customerId:"", projectId:"", invoiceDate:new Date().toISOString().slice(0,10), dueDate:"", discount:0, tax:0, currency:"NGN", notes:"", items:[{description:"", quantity:1, unitPrice:0}]});

  async function load(){
    const [i,c]=await Promise.all([
      fetch(`/api/invoices${status?`?status=${status}`:""}`).then(r=>r.json()),
      fetch("/api/customers").then(r=>r.json()),
    ]);
    if(i.invoices) setInvoices(i.invoices);
    if(c.customers) setCustomers(c.customers);
  }
  useEffect(()=>{load();},[status]);

  async function create(e:React.FormEvent){
    e.preventDefault();
    const payload={...form, discount:Number(form.discount), tax:Number(form.tax), items: form.items.map(it=>({description:it.description, quantity:Number(it.quantity), unitPrice:Number(it.unitPrice)}))};
    const r=await fetch("/api/invoices",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
    const j=await r.json();
    if(!r.ok) alert(j.error?String(j.error).slice(0,400):"Error");
    else { setShowAdd(false); load(); }
  }

  function addItem(){ setForm({...form, items:[...form.items, {description:"", quantity:1, unitPrice:0}]}); }
  function updateItem(idx:number, patch:Partial<typeof form.items[0]>){ const items=[...form.items]; (items[idx] as Record<string,unknown>)={...items[idx], ...patch}; setForm({...form, items}); }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Invoices <span className="text-xs font-normal text-slate-500">— Phase 8 • manual V1 • PDF ready</span></h1>
          <div className="flex gap-2"><Link href="/customers" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Customers</Link><Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link></div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 flex gap-2 overflow-auto">
          {["","Draft","Sent","PartiallyPaid","Paid","Overdue","Cancelled"].map(s=> (
            <button key={s||"ALL"} onClick={()=>setStatus(s)} className={`rounded-full px-3 py-1 text-xs border ${status===s?"bg-emerald-600 text-white border-emerald-600":"bg-white border-slate-200"}`}>{s||"ALL"}</button>
          ))}
          <button onClick={()=>setShowAdd(!showAdd)} className="ml-auto rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{showAdd?"Cancel":"+ Create Invoice"}</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        {showAdd && (
          <form onSubmit={create} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block"><span className="text-xs font-medium">Customer *</span>
                <select value={form.customerId} onChange={e=>setForm({...form,customerId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required>
                  <option value="">Select</option>{customers.map(c=> <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Invoice date *</span><input type="date" value={form.invoiceDate} onChange={e=>setForm({...form,invoiceDate:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required /></label>
              <label className="block"><span className="text-xs font-medium">Due date</span><input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Currency</span><select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">{["NGN","USD","EUR","GBP"].map(c=> <option key={c}>{c}</option>)}</select></label>
              <label className="block"><span className="text-xs font-medium">Discount</span><input type="number" step="0.01" value={form.discount} onChange={e=>setForm({...form,discount:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">Tax</span><input type="number" step="0.01" value={form.tax} onChange={e=>setForm({...form,tax:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><h3 className="text-sm font-semibold">Items *</h3><button type="button" onClick={addItem} className="text-xs border border-slate-200 rounded-full px-3 py-1">+ Add line</button></div>
              {form.items.map((it,i)=> (
                <div key={i} className="grid gap-2 sm:grid-cols-3">
                  <input placeholder="Description" value={it.description} onChange={e=>updateItem(i,{description:e.target.value})} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                  <input type="number" step="0.01" placeholder="Qty" value={it.quantity} onChange={e=>updateItem(i,{quantity:Number(e.target.value)})} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                  <input type="number" step="0.01" placeholder="Unit price" value={it.unitPrice} onChange={e=>updateItem(i,{unitPrice:Number(e.target.value)})} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                </div>
              ))}
              <p className="text-xs text-slate-500">Total = sum(qty×price) − discount + tax • Auto invoice number INV-001 style</p>
            </div>
            <label className="block"><span className="text-xs font-medium">Notes / Terms</span><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Payment terms — due within 7 days" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create invoice (Draft)</button>
          </form>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {invoices.map(inv=> (
            <Link key={inv.id} href={`/invoices/${inv.id}` as never} className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow">
              <div className="flex justify-between">
                <h3 className="text-sm font-bold">{inv.invoiceNumber}</h3>
                <span className={`rounded-full px-2 py-1 text-xs border ${inv.status==="Paid"?"bg-emerald-50 border-emerald-200 text-emerald-700":inv.status==="PartiallyPaid"?"bg-amber-50 border-amber-200 text-amber-700":inv.status==="Sent"?"bg-blue-50 border-blue-200":"bg-slate-50"}`}>{inv.status}</span>
              </div>
              <p className="text-xs text-slate-500">{inv.customerName || inv.customer?.fullName || "—"} • {inv.invoiceDate.slice(0,10)} → {inv.dueDate?.slice(0,10) || "—"}</p>
              <p className="mt-2 text-sm">Total: <strong>{formatMoney(Number(inv.total), "NGN")}</strong> • Paid: {formatMoney(Number(inv.amountPaid),"NGN")} • <span className={Number(inv.balanceDue)>0?"text-red-600":"text-emerald-600"}>Due: {formatMoney(Number(inv.balanceDue),"NGN")}</span></p>
            </Link>
          ))}
        </div>
        {invoices.length===0 && <p className="text-center text-sm text-slate-400 py-10">No invoices. Create one.</p>}
      </main>
    </div>
  );
}
