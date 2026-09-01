import { NextResponse } from "next/server";

export async function GET() {
  // Phase 0 health — does NOT require DB yet (DB check is best-effort)
  let db = "not_configured";
  let prismaOk = false;
  try {
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("user:password")) {
      const { prisma } = await import("@/lib/db/prisma");
      await prisma.$queryRaw`SELECT 1`;
      db = "connected";
      prismaOk = true;
    } else {
      db = "using_dev_placeholder — set DATABASE_URL for Vercel Postgres";
    }
  } catch (e) {
    db = `error: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`;
  }

  return NextResponse.json({
    app: "BIZ-STRIVES",
    version: "0.1.0-phase0",
    deployment: "vercel-unified",
    timestamp: new Date().toISOString(),
    timezone: "Africa/Lagos",
    baseCurrency: "NGN",
    db,
    prismaOk,
    financeEngine: "TOTAL INCOME - BUSINESS EXPENSES - PERSONAL SPENDING = MONEY REMAINING",
    phasesSeeded: ["categories", "accounts", "klassiq-grafikz"],
  });
}
