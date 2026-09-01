"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Comm = {id:string; type:string; segment:string; subject:string; body:string; status:string; recipients:number; createdAt:string};

export default function CommunicationsPage(){
  const [comms,setComms]=useState<Comm[]>([]);
  const [segments,setSegments]=useState<Array<{id:string; label:string}>>([]);
  const [form,setForm]=useState({type:"CustomCampaign", segment:"all", subject:"", body:"Hello {{name}}, ", sendNow:false});
  const [show,setShow]=useState(false);
  const [birthday,setBirthday]=useState<{enabled:boolean; template:string; channel:string} | null>(null);

  async function load(){
    const [c,b]=await Promise.all([
      fetch("/api/communications").then(r=>r.json()),
      fetch("/api/birthday").then(r=>r.json()),
    ]);
    if(c.communications) setComms(c.communications);
    if(c.segments) setSegments(c.segments);
    if(b.settings) setBirthday({enabled: !!b.settings.enabled, template: String(b.settings.template), channel: String(b.settings.channel)});
  }
  useEffect(()=>{load();},[]);

  async function create(e:React.FormEvent){
    e.preventDefault();
    const r=await fetch("/api/communications",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form)});
    const j=await r.json();
    if(!r.ok) alert(j.error?String(j.error).slice(0,400):"Error");
    else { setShow(false); load(); }
  }

  async function runBirthday(){
    const r=await fetch("/api/birthday?run=1").then(x=>x.json());
    alert(`Birthday run: ${r.sent||0} sent, ${r.birthdaysToday||0} birthdays today`);
    load();
  }

  async function saveBirthdayTemplate(){
    if(!birthday) return;
    await fetch("/api/birthday",{method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({template: birthday.template, channel: birthday.channel, enabled: birthday.enabled})});
    alert("Birthday settings saved");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Communications <span className="text-xs font-normal text-slate-500">— Phases 17-18 • Campaigns & Birthdays</span></h1>
          <div className="flex gap-2"><Link href="/customers" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Customers</Link><Link href="/automations" className="rounded-full border border-slate-200 px-3 py-1 text-xs">Automations</Link></div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 flex gap-2">
          <button onClick={()=>setShow(!show)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{show?"Cancel":"+ New Campaign"}</button>
          <button onClick={runBirthday} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">🎂 Run Birthday Check now</button>
          <span className="ml-auto text-xs text-slate-500 py-2 hidden sm:inline">Segments: all • activeThisMonth • paidThisMonth • outstanding • activeProjects</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {show && (
          <form onSubmit={create} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="text-xs font-medium">Type</span>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["MonthlyAppreciation","BirthdayMessage","PaymentConfirmation","InvoiceReminder","ProjectUpdate","CustomCampaign"].map(t=> <option key={t}>{t}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium">Segment</span>
                <select value={form.segment} onChange={e=>setForm({...form,segment:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {segments.map(s=> <option key={s.id} value={s.id}>{s.label}</option>)}
                  <option value="custom">Custom groups</option>
                </select></label>
              <label className="block sm:col-span-2"><span className="text-xs font-medium">Subject *</span><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="e.g., Thank you — August" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required /></label>
              <label className="block sm:col-span-2"><span className="text-xs font-medium">Body — use {"{{name}}"}, {"{{business}}"}, {"{{amount}}"} *</span>
                <textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={3} placeholder="Dear {{name}}, ..." className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                <span className="text-xs text-slate-400">Preview: {form.body.replace("{{name}}","John").replace("{{business}}","Klassiq Grafikz").replace("{{amount}}","₦50,000")}</span>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.sendNow} onChange={e=>setForm({...form,sendNow:e.target.checked})} /> Send now (otherwise save as Draft)</label>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{form.sendNow?"Send campaign":"Save draft"}</button>
            <p className="text-xs text-slate-500">V1: manual send or schedule. Future: automatic via automation engine + Email/WhatsApp/SMS.</p>
          </form>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Campaigns</h3>
          <div className="mt-3 space-y-2">
            {comms.map(c=> (
              <div key={c.id} className="rounded-xl border border-slate-200 p-3 flex justify-between">
                <div>
                  <p className="text-sm font-medium">{c.subject} <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs ml-2">{c.type}</span> <span className={`rounded-full px-2 py-0.5 text-xs border ${c.status==="Sent"?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-amber-50 border-amber-200"}`}>{c.status}</span></p>
                  <p className="text-xs text-slate-500">Segment: {c.segment} • {c.recipients} recipients • {new Date(c.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.body}</p>
                </div>
                <span className="text-xs text-slate-400 self-center">{c.id.slice(0,6)}</span>
              </div>
            ))}
            {comms.length===0 && <p className="text-sm text-slate-400">No campaigns. Create Monthly Appreciation or Invoice Reminder.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">Birthday Automation — Phase 18</h3>
          <p className="text-xs text-slate-500">Runs daily 07:00 via <code className="bg-slate-100 px-1 rounded">0 7 * * *</code> cron → finds customers where birthday = today → personalizes template → sends via enabled channel → records communication.</p>
          {birthday && (
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={birthday.enabled} onChange={e=>setBirthday({...birthday, enabled:e.target.checked})} /> Enable birthday greetings</label>
              <label className="block"><span className="text-xs font-medium">Channel</span>
                <select value={birthday.channel} onChange={e=>setBirthday({...birthday, channel:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="Email">Email</option><option value="WhatsApp">WhatsApp (future)</option><option value="SMS">SMS (future)</option>
                </select></label>
              <label className="block"><span className="text-xs font-medium">Template</span>
                <textarea value={birthday.template} onChange={e=>setBirthday({...birthday, template:e.target.value})} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <span className="text-xs text-slate-400">Preview: {birthday.template.replace("{{name}}","John").replace("{{business}}","Klassiq Grafikz")}</span>
              </label>
              <div className="flex gap-2">
                <button onClick={saveBirthdayTemplate} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Save settings</button>
                <button onClick={runBirthday} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Test run now</button>
              </div>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3">Example: “Happy Birthday, John! Everyone at Klassiq Grafikz wishes you a wonderful birthday and an amazing year ahead.”</p>
        </div>
      </main>
    </div>
  );
}
