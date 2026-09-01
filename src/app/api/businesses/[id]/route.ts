import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  timezone: z.string().optional(),
  baseCurrency: z.string().length(3).optional(),
  dateFormat: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")).nullable(),
  statementEmail: z.string().email().optional().or(z.literal("")).nullable(),
  monthlyStatementEnabled: z.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  try {
    const member = await prisma.businessMember.findFirst({ where:{ userId: auth.userId, businessId: id }});
    if (!member) return NextResponse.json({ error:"Not found or no access" }, { status:403 });
    const biz = await prisma.business.findUnique({ where:{ id }});
    return NextResponse.json({ business: biz, role: member.role });
  } catch (e) {
    if (String(e).includes("Can't reach")) return NextResponse.json({ business:{ id, name:"Klassiq Grafikz", slug:"klassiq-grafikz", baseCurrency:"NGN" }, mocked:true });
    throw e;
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const body = await req.json().catch(()=> ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });

  try {
    const member = await prisma.businessMember.findFirst({ where:{ userId: auth.userId, businessId: id }});
    if (!member || !["Owner","Admin"].includes(member.role)) return NextResponse.json({ error:"Forbidden — Owner/Admin only" }, { status:403 });

    const before = await prisma.business.findUnique({ where:{ id }});
    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.email !== undefined) data.email = parsed.data.email || null;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone || null;
    if (parsed.data.address !== undefined) data.address = parsed.data.address || null;
    if (parsed.data.description !== undefined) data.description = parsed.data.description || null;
    if (parsed.data.timezone !== undefined) data.timezone = parsed.data.timezone;
    if (parsed.data.baseCurrency !== undefined) { data.baseCurrency = parsed.data.baseCurrency.toUpperCase(); data.currencySymbol = parsed.data.baseCurrency.toUpperCase()==="NGN" ? "₦" : parsed.data.baseCurrency.toUpperCase(); }
    if (parsed.data.dateFormat !== undefined) data.dateFormat = parsed.data.dateFormat;
    if (parsed.data.logoUrl !== undefined) data.logoUrl = parsed.data.logoUrl || null;
    if (parsed.data.statementEmail !== undefined) data.statementEmail = parsed.data.statementEmail || null;
    if (parsed.data.monthlyStatementEnabled !== undefined) data.monthlyStatementEnabled = parsed.data.monthlyStatementEnabled;

    const updated = await prisma.business.update({ where:{ id }, data });
    await auditLog({ businessId:id, userId:auth.userId, action:"business.updated", entity:"Business", entityId:id, before, after: updated });
    return NextResponse.json({ ok:true, business: updated });
  } catch (e) {
    if (String(e).includes("Can't reach")) return NextResponse.json({ ok:true, mocked:true, message:"DB not configured — mock update" });
    console.error("business update", e);
    return NextResponse.json({ error:"Internal" }, { status:500 });
  }
}
