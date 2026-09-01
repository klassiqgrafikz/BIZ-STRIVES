import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb() {
  const url = process.env.DATABASE_URL || "";
  return url.includes("user:password") || url.includes("localhost") || !url;
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["Bank", "Cash", "Savings", "MobileMoney", "Other"]),
  currency: z.string().length(3).default("NGN"),
  openingBalance: z.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isMockDb()) {
    return NextResponse.json({
      mocked: true,
      accounts: [
        { id: "mock-1", businessId: "mock-biz", name: "GTBank", type: "Bank", currency: "NGN", openingBalance: "50000.00", currentBalance: "50000.00", status: "Active" },
        { id: "mock-2", businessId: "mock-biz", name: "OPay", type: "MobileMoney", currency: "NGN", openingBalance: "20000.00", currentBalance: "20000.00", status: "Active" },
        { id: "mock-3", businessId: "mock-biz", name: "Cash", type: "Cash", currency: "NGN", openingBalance: "10000.00", currentBalance: "10000.00", status: "Active" },
        { id: "mock-4", businessId: "mock-biz", name: "Business Savings", type: "Savings", currency: "NGN", openingBalance: "0.00", currentBalance: "0.00", status: "Active" },
      ],
    });
  }
  try {
    const businessId = auth.businessId!;
    if (!businessId) return NextResponse.json({ error: "No business" }, { status: 400 });
    const accounts = await prisma.account.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ accounts });
  } catch (e) {
    console.error("accounts GET", e);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (isMockDb()) {
    const acc = { id: "mock-" + Date.now(), businessId: "mock-biz", ...parsed.data, currentBalance: String(parsed.data.openingBalance), status: "Active" };
    return NextResponse.json({ ok: true, mocked: true, account: acc }, { status: 201 });
  }

  try {
    const businessId = auth.businessId!;
    const d = parsed.data;
    const acc = await prisma.account.create({
      data: {
        businessId,
        name: d.name.trim(),
        type: d.type,
        currency: d.currency.toUpperCase(),
        openingBalance: d.openingBalance,
        currentBalance: d.openingBalance,
        notes: d.notes || null,
      },
    });
    await auditLog({ businessId, userId: auth.userId, action: "account.created", entity: "Account", entityId: acc.id, after: acc });
    return NextResponse.json({ ok: true, account: acc }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) return NextResponse.json({ error: "Account name already exists for this business" }, { status: 409 });
    console.error("accounts POST", e);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
