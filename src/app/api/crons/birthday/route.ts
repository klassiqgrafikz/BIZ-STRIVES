import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Phase 18 stub
  return NextResponse.json({ ok: true, message: "Birthday automation stub (Phase 18)", date: new Date().toISOString() });
}
