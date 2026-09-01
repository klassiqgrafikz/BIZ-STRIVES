import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyAccessToken } from "@/lib/auth/jwt";
import LiveDashboard from "@/components/dashboard/LiveDashboard";
import BusinessSwitcher from "@/components/BusinessSwitcher";

export default async function DashboardPage() {
  const store = await cookies();
  const tok = store.get("bizstrives_token")?.value;
  if (!tok) redirect("/login?next=/dashboard");
  try { verifyAccessToken(tok); } catch { redirect("/login?next=/dashboard"); }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">BZ</span>
            <span className="font-bold">Dashboard</span>
            <span className="text-xs text-slate-500 hidden sm:inline">• Phase 10 • 8 cards + live</span>
          </div>
          <div className="flex items-center gap-2">
            <BusinessSwitcher />
            <Link href="/transactions" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Transactions →</Link>
            <Link href="/reports" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs">Reports →</Link>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium hover:bg-slate-50">Logout</button>
            </form>
          </div>
        </div>
      </header>
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 flex gap-4 text-xs overflow-auto">
          {[
            { href: "/dashboard", label: "Overview", active: true },
            { href: "/transactions", label: "Transactions" },
            { href: "/accounts", label: "Accounts" },
            { href: "/savings", label: "Savings" },
            { href: "/customers", label: "Customers" },
            { href: "/projects", label: "Projects" },
            { href: "/invoices", label: "Invoices" },
            { href: "/statements", label: "Statements" },
            { href: "/reports", label: "Reports" },
            { href: "/search", label: "Search" },
            { href: "/communications", label: "Comms" },
            { href: "/automations", label: "Automations" },
            { href: "/notifications", label: "Notifications" },
            { href: "/audit", label: "Audit" },
            { href: "/settings/business", label: "Business" },
          ].map(l=> (
            <Link key={l.href} href={l.href as never} className={`py-3 border-b-2 whitespace-nowrap ${l.active ? "border-emerald-600 text-emerald-700 font-semibold":"border-transparent text-slate-500"}`}>{l.label}</Link>
          ))}
          <span className="ml-auto py-3 text-slate-400 hidden sm:inline">NGN • Africa/Lagos • {new Date().toLocaleDateString("en-NG")}</span>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">BIZ-STRIVES Dashboard</h1>
            <p className="text-sm text-emerald-50 mt-1">Phase 10 — Money Remaining, Reserved, Available, Outstanding, period-aware</p>
          </div>
          <div className="flex gap-2">
            <Link href="/transactions" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-700">+ Add Transaction</Link>
            <Link href="/savings" className="rounded-xl bg-white/15 border border-white/20 px-4 py-2 text-sm font-medium text-white">+ Add Savings</Link>
          </div>
        </div>
        <div className="mt-6">
          <LiveDashboard />
        </div>
      </main>
    </div>
  );
}
