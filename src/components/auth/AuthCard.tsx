import Link from "next/link";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm">BZ</span>
            <span className="font-bold tracking-tight">BIZ-STRIVES</span>
          </Link>
          <p className="text-xs text-slate-500 mt-1">Klassiq Grafikz • Secure workspace</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-600 border-t border-slate-100 pt-4">{footer}</div>}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">Protected • Multi-tenant • Audit-logged</p>
      </div>
    </div>
  );
}
