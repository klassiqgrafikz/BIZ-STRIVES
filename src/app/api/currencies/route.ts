import { NextResponse } from "next/server";
import { SUPPORTED_CURRENCIES, suggestCurrencyFromCountry } from "@/lib/currency";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const detect = searchParams.get("detect");

  if (detect === "1") {
    // Vercel provides x-vercel-ip-country; fallback to accept-language/cloudfront
    const headers = req.headers;
    const country =
      headers.get("x-vercel-ip-country") ||
      headers.get("cf-ipcountry") ||
      headers.get("x-country") ||
      "";
    const suggested = country ? suggestCurrencyFromCountry(country) : "NGN";
    return NextResponse.json({
      detectedCountry: country || null,
      suggestedCurrency: suggested,
      suggestedInfo: SUPPORTED_CURRENCIES[suggested],
      warning: "Suggestion only — never auto-mutates existing transactions (Rule 9)",
    });
  }

  return NextResponse.json({
    currencies: Object.values(SUPPORTED_CURRENCIES),
    baseDefault: "NGN",
    note: "Each transaction stores its own currency + exchangeRate + baseAmount (Rule 8)",
  });
}
