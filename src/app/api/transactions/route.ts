import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";
import { calculatePeriodTotals } from "@/lib/finance/calculations";

function isMockDb() {
  const url = process.env.DATABASE_URL || "";
  return url.includes("user:password") || url.includes("localhost") || !url;
}

// In-memory mock store for dev without DB
const mockStore: Array<Record<string, unknown>> = [
  { id:"m1", type:"INCOME", amount:"500000.00", currency:"NGN", exchangeRate:"1", baseAmount:"500000.00", date:"2026-09-01", description:"Website project — John Doe", accountId:"mock-1" },
  { id:"m2", type:"BUSINESS_EXPENSE", amount:"100000.00", currency:"NGN", exchangeRate:"1", baseAmount:"100000.00", date:"2026-09-02", description:"Hosting + Domain", categoryId:"mock-exp-Hosting" },
  { id:"m3", type:"PERSONAL_SPENDING", amount:"50000.00", currency:"NGN", exchangeRate:"1", baseAmount:"50000.00", date:"2026-09-03", description:"Food & transport", categoryId:"mock-per-Food" },
  { id:"m4", type:"SAVINGS_ALLOCATION", amount:"100000.00", currency:"NGN", exchangeRate:"1", baseAmount:"100000.00", date:"2026-09-04", description:"Emergency Fund" },
];

const createSchema = z.object({
  type: z.enum(["INCOME","BUSINESS_EXPENSE","PERSONAL_SPENDING","SAVINGS_ALLOCATION","SAVINGS_WITHDRAWAL","ACCOUNT_TRANSFER","OTHER"]),
  amount: z.number().positive(),
  currency: z.string().length(3).default("NGN"),
  exchangeRate: z.number().positive().default(1),
  date: z.string().min(1), // ISO date
  categoryId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  vendor: z.string().max(200).optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const period = searchParams.get("period"); // today, thisMonth, lastMonth, thisYear, custom
  const accountId = searchParams.get("accountId");

  if (isMockDb()) {
    let filtered = [...mockStore] as Array<Record<string, unknown>>;
    if (type) filtered = filtered.filter(t=> t.type===type);
    if (from) filtered = filtered.filter(t=> new Date(t.date as string) >= new Date(from));
    if (to) filtered = filtered.filter(t=> new Date(t.date as string) <= new Date(to));
    if (accountId) filtered = filtered.filter(t=> t.accountId===accountId);
    // Use centralized engine for totals
    const totals = calculatePeriodTotals(filtered.map(f=>({ type: f.type as never, amount: Number(f.amount), baseAmount: Number(f.baseAmount), date: new Date(f.date as string) })));
    return NextResponse.json({ mocked:true, transactions: filtered, totals, count: filtered.length });
  }

  try {
    const businessId = auth.businessId!;
    const where: Record<string, unknown> = { businessId };
    if (type) (where as Record<string, unknown>).type = type;
    if (accountId) (where as Record<string, unknown>).accountId = accountId;
    if (from || to) {
      const date: Record<string, Date> = {};
      if (from) date.gte = new Date(from);
      if (to) date.lte = new Date(to);
      (where as Record<string, unknown>).date = date;
    } else if (period) {
      const now = new Date();
      let gte: Date | undefined, lte: Date | undefined;
      if (period==="today") { gte = new Date(now.getFullYear(), now.getMonth(), now.getDate()); lte = new Date(now.getFullYear(), now.getMonth(), now.getDate(),23,59,59,999); }
      else if (period==="thisMonth") { gte = new Date(now.getFullYear(), now.getMonth(),1); lte = new Date(now.getFullYear(), now.getMonth()+1,0,23,59,59,999); }
      else if (period==="lastMonth") { gte = new Date(now.getFullYear(), now.getMonth()-1,1); lte = new Date(now.getFullYear(), now.getMonth(),0,23,59,59,999); }
      else if (period==="thisYear") { gte = new Date(now.getFullYear(),0,1); lte = new Date(now.getFullYear(),11,31,23,59,59,999); }
      if (gte && lte) (where as Record<string, unknown>).date = { gte, lte };
    }

    const txs = await prisma.transaction.findMany({ where: where as never, orderBy:{ date:"desc" }, take:100, include:{ category:true, account:true } });
    const totals = calculatePeriodTotals(txs.map(t=>({ type: t.type as never, amount: Number(t.amount), baseAmount: Number(t.baseAmount), date: t.date })));
    return NextResponse.json({ transactions: txs, totals, count: txs.length });
  } catch (e) { console.error(e); return NextResponse.json({ error:"Internal" }, { status:500 }); }
}

export async function POST(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const body = await req.json().catch(()=> ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });

  const d = parsed.data;
  const date = new Date(d.date);
  if (isNaN(date.getTime())) return NextResponse.json({ error:"Invalid date" }, { status:400 });
  const baseAmount = Math.round(d.amount * d.exchangeRate * 100)/100;

  if (isMockDb()) {
    const tx = { id:"mock-"+Date.now(), businessId:"mock-biz", ...d, amount: String(d.amount), exchangeRate: String(d.exchangeRate), baseAmount: String(baseAmount), date: date.toISOString(), createdById: auth.userId };
    mockStore.unshift(tx);
    return NextResponse.json({ ok:true, mocked:true, transaction: tx }, { status:201 });
  }

  try {
    const businessId = auth.businessId!;
    const tx = await prisma.transaction.create({
      data:{
        businessId,
        type: d.type,
        amount: d.amount,
        currency: d.currency.toUpperCase(),
        exchangeRate: d.exchangeRate,
        baseAmount,
        date,
        categoryId: d.categoryId || null,
        accountId: d.accountId || null,
        customerId: d.customerId || null,
        projectId: d.projectId || null,
        description: d.description || null,
        vendor: d.vendor || null,
        reference: d.reference || null,
        notes: d.notes || null,
        createdById: auth.userId,
      }
    });
    await auditLog({ businessId, userId: auth.userId, action:"transaction.created", entity:"Transaction", entityId: tx.id, after: tx });
    // Optionally update account balance for income/expense
    if (d.accountId && ["INCOME","BUSINESS_EXPENSE","PERSONAL_SPENDING"].includes(d.type)) {
      const delta = d.type==="INCOME" ? d.amount : -d.amount;
      await prisma.account.update({ where:{ id: d.accountId }, data:{ currentBalance:{ increment: delta } }}).catch(()=>{});
    }
    return NextResponse.json({ ok:true, transaction: tx }, { status:201 });
  } catch (e) { console.error(e); return NextResponse.json({ error:"Internal" }, { status:500 }); }
}
