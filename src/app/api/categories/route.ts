import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";

function isMockDb() {
  const url = process.env.DATABASE_URL || "";
  return url.includes("user:password") || url.includes("localhost") || !url;
}

const createSchema = z.object({
  type: z.enum(["INCOME", "BUSINESS_EXPENSE", "PERSONAL_SPENDING"]),
  name: z.string().min(1).max(100),
});

export async function GET(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (isMockDb()) {
    const all = [
      ...["Website Development","Graphic Design","Branding","Video Editing","Photography","Consulting","Other Services","Other Income"].map(n=>({ id:`mock-inc-${n}`, type:"INCOME", name:n, isSystem:true, isArchived:false })),
      ...["Internet","Hosting","Domain","Software","Advertising","Equipment","Transport","Electricity","Office","Communication","Maintenance","Other"].map(n=>({ id:`mock-exp-${n}`, type:"BUSINESS_EXPENSE", name:n, isSystem:true, isArchived:false })),
      ...["Food","Transport","Shopping","Family","Entertainment","Bills","Personal","Other"].map(n=>({ id:`mock-per-${n}`, type:"PERSONAL_SPENDING", name:n, isSystem:true, isArchived:false })),
    ];
    const filtered = type ? all.filter(c=>c.type===type) : all;
    return NextResponse.json({ mocked:true, categories: filtered });
  }
  try {
    const where: Record<string, unknown> = { businessId: auth.businessId! };
    if (type) where.type = type;
    const cats = await prisma.category.findMany({ where: where as never, orderBy: [{ type:"asc"},{ name:"asc"}] });
    return NextResponse.json({ categories: cats });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error:"Internal" }, { status:500 });
  }
}

export async function POST(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(()=> ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  if (isMockDb()) return NextResponse.json({ ok:true, mocked:true, category:{ id:"mock-cat-"+Date.now(), ...parsed.data, isSystem:false }}, { status:201 });
  try {
    const cat = await prisma.category.create({ data:{ businessId: auth.businessId!, type: parsed.data.type, name: parsed.data.name.trim(), isSystem:false }});
    return NextResponse.json({ ok:true, category: cat }, { status:201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique")) return NextResponse.json({ error:"Category already exists for this type" }, { status:409 });
    console.error(e);
    return NextResponse.json({ error:"Internal" }, { status:500 });
  }
}
