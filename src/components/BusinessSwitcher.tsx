"use client";
import { useEffect, useState } from "react";

type Biz = {id:string; name:string; slug:string; role?:string};

export default function BusinessSwitcher(){
  const [bizs,setBizs]=useState<Biz[]>([]);
  const [active,setActive]=useState<string | null>(null);

  useEffect(()=>{
    fetch("/api/businesses").then(r=>r.json()).then(j=>{
      if(j.businesses){
        setBizs(j.businesses);
        if(j.businesses[0]) setActive(j.businesses[0].id);
      }
    });
    // try cookie? For mock we just show first
  },[]);

  if(bizs.length<=1) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 hidden sm:inline">Workspace:</span>
      <select value={active||""} onChange={e=>setActive(e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs">
        {bizs.map(b=> <option key={b.id} value={b.id}>{b.name} ({b.role||"Owner"})</option>)}
      </select>
      <span className="text-xs text-slate-400 hidden lg:inline">• {bizs.length} businesses • isolation enforced per businessId</span>
    </div>
  );
}
