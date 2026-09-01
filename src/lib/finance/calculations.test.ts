// Critical financial tests — BIZ-STRIVES Phase 4 & 26
// Run with: npx vitest run src/lib/finance/calculations.test.ts

import { describe, it, expect } from "vitest";
import {
  calculateMoneyRemaining,
  calculateAvailableMoney,
  calculatePeriodTotals,
  calculateAccountBalance,
  calculateSavingsProgress,
  getDateRangeForPeriod,
  round2,
} from "./calculations";

describe("Financial Engine — Core Rules", () => {
  it("RULE 1: MoneyRemaining = Income - BusinessExpenses - PersonalSpending", () => {
    expect(calculateMoneyRemaining({ totalIncome: 500000, businessExpenses: 100000, personalSpending: 50000 })).toBe(350000);
  });

  it("RULE 2: Savings is reserved, NOT expense — Available = MoneyRemaining - Reserved", () => {
    const moneyRemaining = calculateMoneyRemaining({ totalIncome: 500000, businessExpenses: 100000, personalSpending: 50000 });
    expect(moneyRemaining).toBe(350000);
    expect(calculateAvailableMoney({ moneyRemaining, reservedSavings: 100000 })).toBe(250000);
  });

  it("Full period totals with savings & transfers excluded from moneyRemaining", () => {
    const totals = calculatePeriodTotals([
      { type: "INCOME", amount: 500000, date: new Date() },
      { type: "BUSINESS_EXPENSE", amount: 100000, date: new Date() },
      { type: "PERSONAL_SPENDING", amount: 50000, date: new Date() },
      { type: "SAVINGS_ALLOCATION", amount: 100000, date: new Date() },
      { type: "ACCOUNT_TRANSFER", amount: 20000, date: new Date() },
    ]);
    expect(totals.totalIncome).toBe(500000);
    expect(totals.businessExpenses).toBe(100000);
    expect(totals.personalSpending).toBe(50000);
    expect(totals.moneyRemaining).toBe(350000); // 500-100-50
    expect(totals.savingsAllocated).toBe(100000);
    expect(totals.availableMoney).toBe(250000); // 350-100
    expect(totals.transfers).toBe(20000);
  });

  it("Savings allocations via separate array", () => {
    const totals = calculatePeriodTotals(
      [
        { type: "INCOME", amount: 300000, date: new Date() },
        { type: "BUSINESS_EXPENSE", amount: 50000, date: new Date() },
      ],
      { savingsAllocations: [{ amount: 40000, type: "CONTRIBUTION" }, { amount: 10000, type: "WITHDRAWAL" }] }
    );
    // moneyRemaining 250k, reserved 30k, available 220k
    expect(totals.moneyRemaining).toBe(250000);
    expect(totals.reservedSavings).toBe(30000);
    expect(totals.availableMoney).toBe(220000);
  });

  it("Currency — baseAmount used when present", () => {
    const totals = calculatePeriodTotals([
      { type: "INCOME", amount: 500, currency: "USD", exchangeRate: 1500, baseAmount: 750000, date: new Date() },
      { type: "BUSINESS_EXPENSE", amount: 100, currency: "USD", exchangeRate: 1500, baseAmount: 150000, date: new Date() },
    ]);
    expect(totals.totalIncome).toBe(750000);
    expect(totals.businessExpenses).toBe(150000);
    expect(totals.moneyRemaining).toBe(600000);
  });

  it("Empty transactions => zeros", () => {
    const t = calculatePeriodTotals([]);
    expect(t.moneyRemaining).toBe(0);
    expect(t.availableMoney).toBe(0);
  });

  it("Account balance", () => {
    expect(
      calculateAccountBalance({
        openingBalance: 50000,
        transactions: [
          { type: "INCOME", amount: 200000, date: new Date() },
          { type: "BUSINESS_EXPENSE", amount: 50000, date: new Date() },
          { type: "PERSONAL_SPENDING", amount: 20000, date: new Date() },
        ],
      })
    ).toBe(180000); // 50+200-50-20
  });

  it("Savings progress", () => {
    expect(calculateSavingsProgress(250000, 500000)).toEqual({ progressPct: 50, remaining: 250000 });
    expect(calculateSavingsProgress(500000, 500000)).toEqual({ progressPct: 100, remaining: 0 });
  });

  it("Date ranges exist", () => {
    expect(getDateRangeForPeriod("today").from).toBeInstanceOf(Date);
    expect(getDateRangeForPeriod("thisMonth").from.getDate()).toBe(1);
    expect(getDateRangeForPeriod("custom", { customFrom: new Date("2026-08-01"), customTo: new Date("2026-08-31") }).from.getDate()).toBe(1);
  });

  it("Round2 precision", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});
