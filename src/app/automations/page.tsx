"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Automation = {id:string; name:string; triggerType:string; actionType:string; schedule?:string; enabled:boolean; lastRun?:string; nextRun?:string; errorState?:string};

export default function AutomationsPage(){
  const [autos,setAutos]=useState<Automation[]>([]);
  const [logs,setLogs]=useState<Array<{automationId:string; started:string; completed?:string; status:string; error?:string}>>([]);
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:"", triggerType:"MonthEnds", actionType:"GenerateStatement", schedule:"0 22 L * *", enabled:true});

  async function load(){
    const r=await fetch("/api/automations").then(x=>x.json());
    if(r.automations) setAutos(r.automations);
    if(r.logs) setLogs(r.logs);
  }
  useEffect(()=>{load();},[]);

  async function create(e:React.FormEvent){
    e.preventDefault();
    const r=await fetch("/api/automations",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form)});
    const j=await r.json();
    if(!r.ok) alert(j.error?String(j.error).slice(0,400):"Error");
    else { setShowAdd(false); load(); }
  }

  async function toggle(id:string, enabled:boolean){
    await fetch(`/api/automations/${id}`,{method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({enabled: !enabled})});
    load();
  }

  async function runNow(id:string){
    const r=await fetch(`/api/automations/${id}`,{method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({runNow:true})});
    const j=await r.json();
    alert(j.message || j.log?.message || "Run queued (mock: Completed in 2s)");
    load();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Automations <span className="text-xs font-normal text-slate-500">— Phase 19 • Trigger → Condition → Action</span></h1>
          <div className="flex gap-2"><Link href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Dashboard</Link><Link href="/notifications" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Notifications</Link></div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">Background workers for scheduled/long-running tasks (Redis + BullMQ in production, cron in Vercel-unified).</p>
          <button onClick={()=>setShowAdd(!showAdd)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{showAdd?"Cancel":"+ New Automation"}</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {showAdd && (
          <form onSubmit={create} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="text-xs font-medium">Name *</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Month-end → Generate statement" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required /></label>
              <label className="block"><span className="text-xs font-medium">Trigger</span>
                <select value={form.triggerType} onChange={e=>setForm({...form,triggerType:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["MonthEnds","StatementGenerated","CustomerBirthday","PaymentDetected","SavingsDateArrives","Custom"].map(t=> <option key={t}>{t}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Action</span>
                <select value={form.actionType} onChange={e=>setForm({...form,actionType:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["GenerateStatement","EmailStatement","SendBirthdayMessage","NotifyUser","Custom"].map(a=> <option key={a}>{a}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Schedule (cron)</span><input value={form.schedule} onChange={e=>setForm({...form,schedule:e.target.value})} placeholder="0 22 L * * or 0 7 * * *" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block flex items-center gap-2 mt-6"><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})} /> <span className="text-xs font-medium">Enabled</span></label>
            </div>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create automation</button>
            <p className="text-xs text-slate-500">Conditions as JSON (future): e.g., {"`{"}channel:"Email"{"}"} for birthday. Last/Next run tracked automatically.</p>
          </form>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {autos.map(a=> (
            <div key={a.id} className={`rounded-2xl border p-5 ${a.enabled?"bg-white border-slate-200":"bg-slate-50 border-slate-200 opacity-60"}`}>
              <div className="flex justify-between">
                <h3 className="text-sm font-semibold">{a.name}</h3>
                <span className={`rounded-full px-2 py-1 text-xs border ${a.enabled?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-slate-100"}`}>{a.enabled?"Enabled":"Disabled"}</span>
              </div>
              <p className="text-xs mt-1"><span className="font-medium">Trigger:</span> {a.triggerType} → <span className="font-medium">Action:</span> {a.actionType}</p>
              <p className="text-xs text-slate-500">Schedule: {a.schedule||"event-driven"} • Last: {a.lastRun? new Date(a.lastRun).toLocaleString(): "—"} • Next: {a.nextRun? new Date(a.nextRun).toLocaleString(): "—"}</p>
              {a.errorState && <p className="text-xs text-red-600 mt-1">Error: {a.errorState}</p>}
              <div className="mt-3 flex gap-2">
                <button onClick={()=>toggle(a.id, a.enabled)} className="rounded-full border border-slate-200 px-3 py-1 text-xs">{a.enabled?"Disable":"Enable"}</button>
                <button onClick={()=>runNow(a.id)} className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Run now</button>
                <span className="ml-auto text-xs text-slate-400">{a.id.slice(0,8)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Automation Logs</h3>
          <p className="text-xs text-slate-500">Started / Completed / Failed / Retry / Error</p>
          <ul className="mt-3 space-y-2 text-xs">
            {logs.map((l,i)=> (
              <li key={i} className="flex justify-between border-b border-slate-100 py-2">
                <span>{l.automationId} — {l.status} {l.error? `• ${l.error}`:""}</span>
                <span className="text-slate-500">{l.started? new Date(l.started).toLocaleString(): "—"} → {l.completed? new Date(l.completed).toLocaleString(): "—"}</span>
              </li>
            ))}
            {logs.length===0 && <li className="text-slate-400">No logs yet. Run an automation.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs">
          <p className="font-semibold">Examples mapped:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li><strong>MonthEnds → GenerateStatement</strong> (cron 0 22 L * *) → triggers EmailStatement on StatementGenerated</li>
            <li><strong>CustomerBirthday → SendBirthdayMessage</strong> (cron 0 7 * * *) → uses Email/WhatsApp channel</li>
            <li><strong>PaymentDetected → NotifyUser</strong> (“₦200k received. Allocate?”) → user confirms allocation</li>
            <li><strong>SavingsDateArrives → NotifyUser</strong> → weekly contribution reminder</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
