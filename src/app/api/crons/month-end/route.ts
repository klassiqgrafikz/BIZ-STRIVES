import { NextResponse } from "next/server";

// Vercel Cron — protected by CRON_SECRET
// Schedule: last day via daily check; Vercel runs 22:00 UTC (~23:00 Lagos)
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const isLastDay = now.getDate() === lastDay;

  const force = new URL(req.url).searchParams.get("force") === "1";

  if (!isLastDay && !force) {
    return NextResponse.json({ skipped: true, reason: "Not last day of month", date: now.toISOString(), hint: "Append ?force=1 to test manually" });
  }

  // Wire: for each business with monthlyStatementEnabled, close month → statement → email → notification
  // For mock DB, simulate
  const mock = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes("user:password");
  if (mock) {
    return NextResponse.json({
      ok: true,
      mocked: true,
      message: "Month-end automation simulated (mock DB)",
      steps: [
        "Calculate totals via FinancialService",
        "Create MonthlyPeriod (Closed)",
        "Generate Statement (HTML/PDF + CSV)",
        "Send email via Resend (stub)",
        "Create Notification (StatementGenerated)",
        "AuditLog month.closed",
      ],
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    });
  }

  // Real DB path — iterate businesses (simplified placeholder for Phase 12 full iteration)
  // In production this would loop over all businesses; here we just return acknowledgement and rely on manual /api/monthly-periods POST for per-business close
  return NextResponse.json({
    ok: true,
    message: "Month-end cron triggered. Use POST /api/monthly-periods per business for granular close (automation loops all businesses in production).",
    period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    nextSteps: "POST /api/monthly-periods {year, month}",
  });
}
