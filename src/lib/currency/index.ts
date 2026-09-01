// Currency utilities — Phase 2 requirements
// Each transaction retains original currency + exchangeRate + baseAmount
// Location detection must NEVER silently mutate historical records

export type CurrencyInfo = {
  code: string;
  symbol: string;
  name: string;
};

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
  EUR: { code: "EUR", symbol: "€", name: "Euro" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound" },
  GHS: { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  KES: { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand" },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
};

export function getCurrencyInfo(code: string): CurrencyInfo {
  return SUPPORTED_CURRENCIES[code.toUpperCase()] ?? { code: code.toUpperCase(), symbol: code.toUpperCase(), name: code };
}

export function formatCurrency(amount: number | string, currencyCode: string = "NGN"): string {
  const info = getCurrencyInfo(currencyCode);
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${info.symbol}0.00`;
  // Use Intl for proper grouping; fallback to simple
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: info.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${info.symbol}${num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function toBaseAmount(amount: number, exchangeRate: number): number {
  // amount * exchangeRate, rounded to 2dp to avoid floating errors
  return Math.round(amount * exchangeRate * 100) / 100;
}

// Suggest currency from approximate location — NEVER auto-apply to existing records
export function suggestCurrencyFromCountry(countryCode: string): string {
  const map: Record<string, string> = {
    NG: "NGN",
    US: "USD",
    GB: "GBP",
    DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
    GH: "GHS",
    KE: "KES",
    ZA: "ZAR",
    CA: "CAD",
  };
  return map[countryCode?.toUpperCase()] ?? "NGN";
}

// Currency formatting with symbol only (for cards)
export function formatMoney(amount: number | string, currencyCode: string = "NGN"): string {
  const info = getCurrencyInfo(currencyCode);
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${info.symbol}${Math.abs(num).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
