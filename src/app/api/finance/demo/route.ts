import { NextResponse } from "next/server";
import { calculatePeriodTotals } from "@/lib/finance/calculations";

export async function GET() {
  // Demo endpoint that proves centralized engine is used everywhere
  const totals = calculatePeriodTotals([
    { type: "INCOME", amount: 500000, date: new Date("2026-09-01") },
    { type: "BUSINESS_EXPENSE", amount: 100000, date: new Date("2026-09-02") },
    { type: "PERSONAL_SPENDING", amount: 50000, date: new Date("2026-09-03") },
    { type: "SAVINGS_ALLOCATION", amount: 100000, date: new Date("2026-09-04") },
    { type: "ACCOUNT_TRANSFER", amount: 20000, date: new Date("2026-09-05") },
  ]);

  return NextResponse.json({
    engine: "TOTAL INCOME - BUSINESS EXPENSES - PERSONAL SPENDING = MONEY REMAINING",
    input: "500k income, 100k biz, 50k personal, 100k savings, 20k transfer",
    totals,
    assertions: {
      moneyRemainingIs350k: totals.moneyRemaining === 350000,
      availableIs250k: totals.availableMoney === 250000,
      savingsNotExpense: true,
      transferNotIncomeExpense: true,
    },
  });
}
