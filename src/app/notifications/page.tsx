"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Notif = {id:string; type:string; title:string; message:string; read:boolean; createdAt:string; actionLink?:string};

export default function NotificationsPage(){
  const [notifs,setNotifs]=useState<Notif[]>([]);
  const [unread,setUnread]=useState(0);
  const [filter,setFilter]=useState<"all"|"unread">("all");

  async function load(){
    const q = filter==="unread"?"?unread=1":"";
    const r=await fetch(`/api/notifications${q}`).then(x=>x.json());
    if(r.notifications) { setNotifs(r.notifications); setUnread(r.unreadCount||0); }
  }
  useEffect(()=>{load();},[filter]);

  async function markAllRead(){
    await fetch("/api/notifications",{method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({markAll:true, read:true})});
    load();
  }
  async function toggleRead(id:string, read:boolean){
    await fetch("/api/notifications",{method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ids:[id], read})});
    load();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Notifications <span className="text-xs font-normal text-slate-500">— Phase 15 • In-app + Email</span></h1>
          <div className="flex gap-2">
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs">{unread} unread</span>
            <Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link>
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-6 pb-3 flex gap-2">
          <button onClick={()=>setFilter("all")} className={`rounded-full px-3 py-1 text-xs border ${filter==="all"?"bg-emerald-600 text-white border-emerald-600":"bg-white"}`}>All</button>
          <button onClick={()=>setFilter("unread")} className={`rounded-full px-3 py-1 text-xs border ${filter==="unread"?"bg-emerald-600 text-white border-emerald-600":"bg-white"}`}>Unread</button>
          <button onClick={markAllRead} className="ml-auto rounded-full bg-slate-900 px-3 py-1 text-xs text-white">Mark all read</button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-6 space-y-3">
        {notifs.length===0? <p className="text-center text-sm text-slate-400 py-10">No notifications.</p> :
          notifs.map(n=> (
            <div key={n.id} className={`rounded-2xl border p-4 flex gap-3 ${n.read?"bg-white border-slate-200 opacity-70":"bg-white border-emerald-200 shadow-sm"}`}>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm shrinkn-0 ${n.type==="MoneyReceived"?"bg-emerald-100":n.type==="InvoiceOverdue"?"bg-red-100":n.type==="StatementGenerated"?"bg-blue-100":"bg-slate-100"}`}>
                {n.type==="MoneyReceived"?"₦":n.type==="InvoiceOverdue"?"!":n.type==="SavingsDue"?"◷":n.type==="StatementGenerated"?"📄":"•"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-slate-600">{n.message}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()} • {n.type} {n.actionLink? `• action: ${n.actionLink}`:""}</p>
                {n.actionLink && <Link href={n.actionLink as never} className="text-xs font-medium text-emerald-700 hover:underline mt-1 inline-block">Go → {n.actionLink}</Link>}
              </div>
              <button onClick={()=>toggleRead(n.id, !n.read)} className={`rounded-full px-3 py-1 text-xs h-fit border ${n.read?"bg-white":"bg-emerald-50 border-emerald-200"}`}>{n.read?"Mark unread":"Mark read"}</button>
            </div>
          ))}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs">
          <p className="font-semibold">Future channels</p>
          <p>Browser push, mobile push, WhatsApp, SMS — added later. Now: In-app + Email via Resend. Automation engine (Phase 19) will route via trigger → action.</p>
        </div>
      </main>
    </div>
  );
}
