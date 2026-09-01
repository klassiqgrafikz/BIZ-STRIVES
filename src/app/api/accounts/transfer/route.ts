import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb() {
  const url = process.env.DATABASE_URL || "";
  return url.includes("user:password") || url.includes("localhost") || !url;
}

const schema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default("NGN"),
  exchangeRate: z.number().positive().default(1),
  date: z.string().or(z.date()),
  description: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.fromAccountId === parsed.data.toAccountId) return NextResponse.json({ error: "Source and destination must differ" }, { status: 400 });

  if (isMockDb()) {
    return NextResponse.json({
      ok: true,
      mocked: true,
      transfer: { ...parsed.data, id: "mock-transfer-" + Date.now() },
      note: "Transfers are NOT income/expense — excluded from Money Remaining (Rule 3)",
    });
  }

  try {
    const businessId = auth.businessId!;
    const d = parsed.data;
    const date = new Date(d.date);
    const baseAmount = Math.round(d.amount * d.exchangeRate * 100) / 100;

    // Verify accounts belong to business
    const fromAcc = await prisma.account.findFirst({ where: { id: d.fromAccountId, businessId } });
    const toAcc = await prisma.account.findFirst({ where: { id: d.toAccountId, businessId } });
    if (!fromAcc || !toAcc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // Create paired ACCOUNT_TRANSFER transactions (Rule 3: must NOT affect Money Remaining)
    // For simplicity create one transaction record with type ACCOUNT_TRANSFER + reference to both accounts via description
    const tx = await prisma.transaction.create({
      data: {
        businessId,
        type: "ACCOUNT_TRANSFER",
        amount: d.amount,
        currency: d.currency.toUpperCase(),
        exchangeRate: d.exchangeRate,
        baseAmount,
        date,
        accountId: d.fromAccountId,
        description: d.description || `Transfer ${fromAcc.name} → ${toAcc.name}`,
        reference: d.reference || null,
        createdById: auth.userId,
        notes: `Transfer to ${toAcc.name} (${toAcc.id})`,
      },
    });

    // Also adjust currentBalance for both accounts (optional but expected for account pages)
    await prisma.account.update({ where: { id: fromAcc.id }, data: { currentBalance: { decrement: d.amount } } });
    await prisma.account.update({ where: { id: toAcc.id }, data: { currentBalance: { increment: d.amount } } });

    await auditLog({ businessId, userId: auth.userId, action: "account.transfer", entity: "Transaction", entityId: tx.id, after: tx });
    return NextResponse.json({ ok: true, transaction: tx }, { status: 201 });
  } catch (e) {
    console.error("transfer", e);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
