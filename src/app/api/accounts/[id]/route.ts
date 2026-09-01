import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb() {
  const url = process.env.DATABASE_URL || "";
  return url.includes("user:password") || url.includes("localhost") || !url;
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["Bank", "Cash", "Savings", "MobileMoney", "Other"]).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(["Active", "Archived"]).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isMockDb()) return NextResponse.json({ account: { id, name: "GTBank", type: "Bank", currency: "NGN", status: "Active" }, mocked: true });
  try {
    const acc = await prisma.account.findFirst({ where: { id, businessId: auth.businessId! } });
    if (!acc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const txs = await prisma.transaction.findMany({ where: { accountId: id }, orderBy: { date: "desc" }, take: 20 });
    return NextResponse.json({ account: acc, recentTransactions: txs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (isMockDb()) return NextResponse.json({ ok: true, mocked: true, account: { id, ...parsed.data } });

  try {
    const existing = await prisma.account.findFirst({ where: { id, businessId: auth.businessId! } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.type !== undefined) data.type = parsed.data.type;
    if (parsed.data.currency !== undefined) data.currency = parsed.data.currency.toUpperCase();
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    const updated = await prisma.account.update({ where: { id }, data });
    await auditLog({ businessId: auth.businessId!, userId: auth.userId, action: "account.updated", entity: "Account", entityId: id, before: existing, after: updated });
    return NextResponse.json({ ok: true, account: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isMockDb()) return NextResponse.json({ ok: true, mocked: true });
  try {
    const existing = await prisma.account.findFirst({ where: { id, businessId: auth.businessId! } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Archive instead of delete if has transactions
    const hasTx = await prisma.transaction.findFirst({ where: { accountId: id } });
    if (hasTx) {
      await prisma.account.update({ where: { id }, data: { status: "Archived" } });
      return NextResponse.json({ ok: true, archived: true, message: "Archived (has transactions)" });
    }
    await prisma.account.delete({ where: { id } });
    await auditLog({ businessId: auth.businessId!, userId: auth.userId, action: "account.deleted", entity: "Account", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
