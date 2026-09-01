import Link from "next/link";

export default function PricingPage(){
  const plans=[
    {name:"Free", price:"₦0", period:"/mo", features:["1 business","Up to 30 customers","100 invoices","1 savings goal","Monthly statements","Email support"], cta:"Start free", highlighted:false},
    {name:"Starter", price:"₦5,000", period:"/mo", features:["2 businesses","200 customers","Unlimited invoices","5 savings goals","Automated statements","Resend email"], cta:"Choose Starter", highlighted:false},
    {name:"Pro", price:"₦15,000", period:"/mo", features:["5 businesses","1,000 customers","Team roles (5 users)","Unlimited savings","Birthday automation","Priority support"], cta:"Choose Pro", highlighted:true},
    {name:"Business", price:"₦40,000", period:"/mo", features:["Unlimited businesses","10k customers","Unlimited users","Bank feeds (future)","White-label","SAML SSO"], cta:"Contact sales", highlighted:false},
  ];
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm">BZ</span><span className="font-bold">BIZ-STRIVES</span></Link>
          <div className="flex gap-2"><Link href="/login" className="rounded-full border border-slate-200 px-4 py-1.5 text-xs">Log in</Link><Link href="/signup" className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white">Create workspace</Link></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Pricing • Simple • Scalable • Vercel-unified</p>
          <h1 className="text-3xl font-bold mt-2">Scale as you grow</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl mx-auto">Start with one business (Klassiq Grafikz) free. Subscription billing isolated from core financial engine (Phase 24). Limits are future-ready — core stays simple.</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map(p=> (
            <div key={p.name} className={`rounded-2xl border p-6 ${p.highlighted?"border-emerald-600 bg-white shadow-lg ring-1 ring-emerald-600":"border-slate-200 bg-white"}`}>
              {p.highlighted && <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">Most popular</span>}
              <h3 className="text-sm font-bold mt-2">{p.name}</h3>
              <p className="mt-1"><span className="text-2xl font-bold">{p.price}</span><span className="text-xs text-slate-500">{p.period}</span></p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                {p.features.map(f=> <li key={f} className="flex gap-2"><span className="text-emerald-600">✓</span>{f}</li>)}
              </ul>
              <Link href="/signup" className={`mt-5 block text-center rounded-xl px-4 py-2 text-sm font-semibold ${p.highlighted?"bg-emerald-600 text-white":"border border-slate-200 bg-slate-50"}`}>{p.cta}</Link>
              <p className="text-xs text-slate-400 mt-2">Self-hostable • Postgres owned by you • No vendor lock</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold">What’s included in every plan</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Financial engine: Money In − Biz − Personal = Remaining (Rule 1)</li>
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Reserved savings not expense (Rule 2) • Transfers not income (Rule 3)</li>
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Multi-currency per transaction (Rule 8)</li>
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Month lock + audit (Rule 7)</li>
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Invoices • Customers • Projects • Accounts • Savings</li>
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Statements PDF/CSV + Resend email + Notifications</li>
          </ul>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">Phase 30 polish — landing, pricing, docs, empty states, mobile, SEO. <Link href="/" className="underline">← Back to platform</Link></p>
      </main>
    </div>
  );
}
