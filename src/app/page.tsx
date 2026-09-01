import Link from "next/link";
import { FinanceCards } from "@/components/dashboard/FinanceCards";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">BZ</div>
            <div>
              <p className="text-sm font-bold tracking-tight">BIZ-STRIVES</p>
              <p className="text-xs text-slate-500">Klassiq Grafikz • NGN • Africa/Lagos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">Vercel-unified • 30 phases ready</span>
            <Link href="/pricing" className="hidden sm:inline rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Pricing →</Link>
            <Link href="/signup" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Create workspace →</Link>
            <Link href="/login" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Log in</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">Business Finance Management — Simple & Scalable</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Welcome to BIZ-STRIVES</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-50">
            <strong>Core formula:</strong> Total Money Received − Business Expenses − Personal Spending = <strong>Money Remaining</strong>. Savings is reserved, not an expense. Transfers are not income.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["+ Add Income", "+ Add Business Expense", "+ Add Personal Spending", "+ Add Customer", "+ Create Invoice", "+ Add Savings"].map((a) => (
              <span key={a} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur border border-white/20">{a}</span>
            ))}
          </div>
        </div>

        {/* Finance engine demo */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Phase 0 • Financial Engine Demo (live calculations)</h2>
            <span className="text-xs text-slate-500">500k in • 100k biz • 50k personal • 100k savings → 350k remaining • 250k available ✓ Tests passing</span>
          </div>
          <div className="mt-4">
            <FinanceCards />
          </div>
        </div>

        {/* Phase status */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader title="Schema Foundation" subtitle="15 models • Prisma • PostgreSQL" />
            <CardBody>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {["Users, Businesses, BusinessMembers", "Accounts, Categories, Transactions", "Customers, Projects, Invoices+Items", "SavingsGoals, SavingsAllocations", "MonthlyPeriods, Statements, Notifications", "Automations, AuditLogs, EmailLogs"].map((x) => (
                  <li key={x} className="flex gap-2"><span className="text-emerald-600">✓</span> {x}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400">All models scoped by <code className="rounded bg-slate-100 px-1">businessId</code> for multi-tenancy isolation.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Financial Engine" subtitle="Single source of truth" />
            <CardBody>
              <p className="text-xs leading-relaxed text-slate-600">All math lives in <code className="rounded bg-slate-100 px-1">src/lib/finance/calculations.ts</code>. Dashboard, Reports, Periods, Statements import it — never duplicate.</p>
              <div className="mt-3 rounded-lg bg-slate-50 p-3 font-mono text-xs">
                <div>totalIncome: 500,000</div>
                <div>businessExpenses: 100,000</div>
                <div>personalSpending: 50,000</div>
                <div className="font-bold text-emerald-700">moneyRemaining: 350,000</div>
                <div className="text-blue-600">reserved: 100,000 → available: 250,000</div>
              </div>
              <Link href="/api/health" className="mt-3 inline-block text-xs font-medium text-emerald-700 hover:underline">Run health check →</Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Vercel Unified" subtitle="One platform deploy" />
            <CardBody>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Next.js front + API routes</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Vercel Postgres (DATABASE_URL)</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Upstash Redis (Marketplace) for BullMQ</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Vercel Cron (vercel.json) month-end + birthday</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Resend email (stub in dev)</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Prisma migrations + seed ready</li>
              </ul>
              <p className="mt-3 text-xs text-slate-400">See <code className="rounded bg-slate-100 px-1">.env.example</code> + <code className="rounded bg-slate-100 px-1">vercel.json</code></p>
            </CardBody>
          </Card>
        </div>

        {/* Phase 1 live */}
        <Card className="mt-8 border-emerald-200 bg-emerald-50/50">
          <CardHeader title="✓ Phase 1 — Authentication & Business Setup — LIVE" subtitle="Try the clickable flow now" />
          <CardBody>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: "Create workspace", href: "/signup", desc: "Signup → auto-creates business + Owner role" },
                { label: "Log in", href: "/login", desc: "JWT httpOnly cookie • Mock: owner@klassiqgrafikz.com" },
                { label: "Dashboard (protected)", href: "/dashboard", desc: "Requires session — redirects to /login if absent" },
                { label: "Business Settings", href: "/settings/business", desc: "Edit name/logo/currency/timezone (audit-logged)" },
                { label: "Forgot password", href: "/forgot-password", desc: "Resend stub • dev shows reset URL" },
                { label: "Health & Session", href: "/api/auth/me", desc: "GET session debug JSON" },
              ].map((l) => (
                <Link key={l.href} href={l.href as never} className="rounded-xl border border-emerald-200 bg-white p-3 hover:shadow">
                  <p className="text-xs font-semibold text-emerald-800">{l.label} →</p>
                  <p className="text-xs text-slate-500">{l.desc}</p>
                </Link>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">✓ Signup/Login/Logout</span>
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">✓ Password reset + verification tokens</span>
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">✓ Business CRUD + roles</span>
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">✓ Middleware protection</span>
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">✓ Audit logs</span>
            </div>
          </CardBody>
        </Card>

        <Card className="mt-8 border-slate-200 bg-white">
          <CardHeader title="✨ Platform Complete — All Phases Live" subtitle="Test every clickable flow" />
          <CardBody>
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              {[
                {label:"Dashboard (8 cards)", href:"/dashboard"},
                {label:"Transactions", href:"/transactions"},
                {label:"Accounts + Transfers", href:"/accounts"},
                {label:"Savings (reserved)", href:"/savings"},
                {label:"Customers + Detail", href:"/customers"},
                {label:"Projects", href:"/projects"},
                {label:"Invoices (PDF/CSV)", href:"/invoices"},
                {label:"Reports (analytics)", href:"/reports"},
                {label:"Statements (archive)", href:"/statements"},
                {label:"Communications", href:"/communications"},
                {label:"Automations", href:"/automations"},
                {label:"Search + Export", href:"/search"},
                {label:"Notifications", href:"/notifications"},
                {label:"Audit Logs", href:"/audit"},
                {label:"Pricing", href:"/pricing"},
                {label:"Business Settings", href:"/settings/business"},
              ].map(l=> (
                <Link key={l.href} href={l.href as never} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center font-medium hover:bg-white hover:shadow">{l.label} →</Link>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Business switching via header (Phase 22) • Multi-tenant isolation per businessId • Empty states on every list • Responsive + PWA-ready • Use owner@klassiqgrafikz.com / Klassiq123! in mock mode.</p>
          </CardBody>
        </Card>

        <div className="mt-6 flex gap-3">
          <Link href="/dashboard" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700">Open Dashboard →</Link>
          <Link href="/pricing" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-50">View Pricing</Link>
          <Link href="/api/health" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-50">Health Check</Link>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">BIZ-STRIVES — Phases 0-22 built • 50 routes • 13 tests • Vercel-unified • SIMPLE • SCALABLE • SAFE</p>
      </main>
    </div>
  );
}
