"use client";
import { formatMoney } from "@/lib/currency";
import { calculatePeriodTotals } from "@/lib/finance/calculations";
import { Card, CardBody } from "@/components/ui/Card";

// Demo data for clickable mockup — same numbers as Phase 26 spec test
const demoTx = [
  { type: "INCOME" as const, amount: 500000, date: new Date() },
  { type: "BUSINESS_EXPENSE" as const, amount: 100000, date: new Date() },
  { type: "PERSONAL_SPENDING" as const, amount: 50000, date: new Date() },
  { type: "SAVINGS_ALLOCATION" as const, amount: 100000, date: new Date() },
];

export function FinanceCards() {
  const t = calculatePeriodTotals(demoTx);
  const cards = [
    { label: "Total Money Received", value: t.totalIncome, accent: "text-slate-900", bg: "bg-emerald-50 border-emerald-200" },
    { label: "Business Expenses", value: t.businessExpenses, accent: "text-red-600", bg: "bg-red-50 border-red-200", prefix: "-" },
    { label: "Personal Spending", value: t.personalSpending, accent: "text-orange-600", bg: "bg-orange-50 border-orange-200", prefix: "-" },
    { label: "Money Remaining", value: t.moneyRemaining, accent: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200" },
    { label: "Reserved Savings", value: t.reservedSavings, accent: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    { label: "Available Money", value: t.availableMoney, accent: "text-emerald-700", bg: "bg-white border-emerald-300 border-2" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className={`${c.bg} p-5`}>
          <CardBody className="p-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={`mt-2 text-2xl font-bold ${c.accent}`}>
              {c.prefix ?? ""}{formatMoney(c.value, "NGN")}
            </p>
            <p className="mt-1 text-xs text-slate-400">Demo — {c.label.includes("Remaining") ? "500k - 100k - 50k = 350k" : c.label.includes("Available") ? "350k - 100k = 250k" : "Sept 2026"}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
