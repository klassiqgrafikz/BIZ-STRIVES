// BIZ-STRIVES — Centralized Financial Engine
// CORE RULE (BIZ-STRIVES_Complete_Development_Phases-2.txt:12-21, 1395-1405):
//   TOTAL MONEY RECEIVED - BUSINESS EXPENSES - PERSONAL SPENDING = MONEY REMAINING
//   Savings is RESERVED, not an expense. Available = MoneyRemaining - ReservedSavings
//   Transfers are NOT income/expense.
// THIS MODULE IS THE SINGLE SOURCE OF TRUTH for all financial math.
// Dashboard, Reports, MonthlyPeriods, Statements, Exports MUST import from here.

export type TransactionType =
  | "INCOME"
  | "BUSINESS_EXPENSE"
  | "PERSONAL_SPENDING"
  | "SAVINGS_ALLOCATION"
  | "SAVINGS_WITHDRAWAL"
  | "ACCOUNT_TRANSFER"
  | "OTHER";

export type FinancialTransaction = {
  id?: string;
  type: TransactionType;
  amount: number | string; // always positive stored amount
  baseAmount?: number | string; // amount in base currency (for multi-currency)
  currency?: string;
  exchangeRate?: number | string;
  date: string | Date;
};

export type SavingsAllocation = {
  amount: number | string;
  type: "CONTRIBUTION" | "WITHDRAWAL";
};

export type PeriodTotals = {
  totalIncome: number;
  businessExpenses: number;
  personalSpending: number;
  moneyRemaining: number;
  savingsAllocated: number; // reserved contributions - withdrawals
  reservedSavings: number; // same as savingsAllocated, alias for clarity
  availableMoney: number; // moneyRemaining - reservedSavings
  transfers: number; // tracking only, not in moneyRemaining formula
  other: number;
  transactionCount: number;
};

function toNumber(v: number | string | undefined | null): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

/**
 * Core formula — DO NOT DUPLICATE ELSEWHERE
 * Rule 1 & 2: savings does NOT reduce moneyRemaining
 */
export function calculateMoneyRemaining(params: {
  totalIncome: number;
  businessExpenses: number;
  personalSpending: number;
}): number {
  const { totalIncome, businessExpenses, personalSpending } = params;
  return round2(totalIncome - businessExpenses - personalSpending);
}

export function calculateAvailableMoney(params: {
  moneyRemaining: number;
  reservedSavings: number;
}): number {
  return round2(params.moneyRemaining - params.reservedSavings);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Aggregate a list of transactions into PeriodTotals
 * Handles currency via baseAmount if present, else amount
 * Rule: only INCOME, BUSINESS_EXPENSE, PERSONAL_SPENDING affect moneyRemaining
 */
export function calculatePeriodTotals(
  transactions: FinancialTransaction[],
  opts?: { savingsAllocations?: SavingsAllocation[] }
): PeriodTotals {
  let totalIncome = 0;
  let businessExpenses = 0;
  let personalSpending = 0;
  let transfers = 0;
  let other = 0;

  for (const tx of transactions) {
    // Use baseAmount when multi-currency reporting is needed; fallback to amount
    const val = tx.baseAmount !== undefined ? toNumber(tx.baseAmount) : toNumber(tx.amount);
    switch (tx.type) {
      case "INCOME":
        totalIncome += val;
        break;
      case "BUSINESS_EXPENSE":
        businessExpenses += val;
        break;
      case "PERSONAL_SPENDING":
        personalSpending += val;
        break;
      case "ACCOUNT_TRANSFER":
        transfers += val;
        break;
      case "SAVINGS_ALLOCATION":
      case "SAVINGS_WITHDRAWAL":
        // Intentionally NOT counted here — savings tracked separately
        break;
      case "OTHER":
      default:
        other += val;
        break;
    }
  }

  const moneyRemaining = calculateMoneyRemaining({ totalIncome, businessExpenses, personalSpending });

  // Savings reserved = sum contributions - withdrawals
  let savingsAllocated = 0;
  if (opts?.savingsAllocations) {
    for (const sa of opts.savingsAllocations) {
      const amt = toNumber(sa.amount);
      savingsAllocated += sa.type === "CONTRIBUTION" ? amt : -amt;
    }
  } else {
    // Also derive from transactions if they are savings types (amount stored positive)
    for (const tx of transactions) {
      if (tx.type === "SAVINGS_ALLOCATION") savingsAllocated += toNumber(tx.baseAmount ?? tx.amount);
      if (tx.type === "SAVINGS_WITHDRAWAL") savingsAllocated -= toNumber(tx.baseAmount ?? tx.amount);
    }
  }

  savingsAllocated = round2(Math.max(0, savingsAllocated)); // reserved can't be negative via this calc (withdrawals capped elsewhere)
  const reservedSavings = savingsAllocated;
  const availableMoney = calculateAvailableMoney({ moneyRemaining, reservedSavings });

  return {
    totalIncome: round2(totalIncome),
    businessExpenses: round2(businessExpenses),
    personalSpending: round2(personalSpending),
    moneyRemaining,
    savingsAllocated: reservedSavings,
    reservedSavings,
    availableMoney,
    transfers: round2(transfers),
    other: round2(other),
    transactionCount: transactions.length,
  };
}

// Date filtering — system must reconstruct any period from individual dated transactions
export type DateRange = { from: Date; to: Date };

export function getDateRangeForPeriod(
  period: "today" | "thisWeek" | "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear" | "custom",
  opts?: { customFrom?: Date; customTo?: Date; timezone?: string }
): DateRange {
  const now = new Date();
  // Use local time for now; timezone-aware filtering will use business timezone in API layer
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "thisWeek": {
      const day = now.getDay(); // 0 Sun
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      return { from: startOfDay(monday), to: endOfDay(now) };
    }
    case "thisMonth":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case "lastMonth": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: first, to: endOfDay(last) };
    }
    case "thisQuarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1), to: endOfDay(now) };
    }
    case "thisYear":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    case "custom":
      if (!opts?.customFrom || !opts?.customTo) throw new Error("custom range requires customFrom and customTo");
      return { from: startOfDay(opts.customFrom), to: endOfDay(opts.customTo) };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export function filterTransactionsByDate(transactions: FinancialTransaction[], range: DateRange): FinancialTransaction[] {
  return transactions.filter((tx) => {
    const d = tx.date instanceof Date ? tx.date : new Date(tx.date);
    return d >= range.from && d <= range.to;
  });
}

// Account balance: openingBalance + sum(income in) - sum(expenses/spending out) — transfers handled as paired entries
export function calculateAccountBalance(params: {
  openingBalance: number;
  transactions: FinancialTransaction[];
}): number {
  let bal = toNumber(params.openingBalance);
  for (const tx of params.transactions) {
    const val = toNumber(tx.baseAmount ?? tx.amount);
    if (tx.type === "INCOME") bal += val;
    else if (tx.type === "BUSINESS_EXPENSE" || tx.type === "PERSONAL_SPENDING") bal -= val;
    // transfers & savings intentionally excluded from generic calc — caller should provide filtered list for account-specific
  }
  return round2(bal);
}

// Savings goal progress
export function calculateSavingsProgress(currentAmount: number, targetAmount: number): {
  progressPct: number;
  remaining: number;
} {
  if (targetAmount <= 0) return { progressPct: 0, remaining: 0 };
  const pct = Math.min(100, round2((currentAmount / targetAmount) * 100));
  return { progressPct: pct, remaining: round2(Math.max(0, targetAmount - currentAmount)) };
}

// Monthly period helpers
export function getMonthBounds(year: number, month: number): DateRange {
  // month 1-12
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
}

export function formatPeriodLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}
