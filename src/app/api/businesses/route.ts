import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  timezone: z.string().default("Africa/Lagos"),
  baseCurrency: z.string().length(3).default("NGN"),
  dateFormat: z.string().default("DD/MM/YYYY"),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)+"-"+Math.random().toString(36).slice(2,6);
}

export async function GET(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  try {
    const members = await prisma.businessMember.findMany({ where:{ userId: auth.userId }, include:{ business:true }});
    return NextResponse.json({ businesses: members.map(m=> ({ ...m.business, role: m.role })) });
  } catch (e) {
    if (String(e).includes("Can't reach")) return NextResponse.json({ businesses:[{ id:"mock-biz", name:"Klassiq Grafikz", slug:"klassiq-grafikz", baseCurrency:"NGN", timezone:"Africa/Lagos", role:"Owner" }], mocked:true });
    throw e;
  }
}

export async function POST(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const body = await req.json().catch(()=> ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });

  const d = parsed.data;
  try {
    const slug = slugify(d.name);
    const biz = await prisma.business.create({
      data:{
        name: d.name.trim(),
        slug,
        email: d.email || null,
        phone: d.phone || null,
        address: d.address || null,
        description: d.description || null,
        timezone: d.timezone,
        baseCurrency: d.baseCurrency.toUpperCase(),
        currencySymbol: d.baseCurrency.toUpperCase()==="NGN" ? "₦" : d.baseCurrency.toUpperCase(),
        dateFormat: d.dateFormat,
        logoUrl: d.logoUrl || null,
      }
    });
    await prisma.businessMember.create({ data:{ userId: auth.userId, businessId: biz.id, role:"Owner" }});
    // seed categories/accounts
    for (const n of ["Website Development","Graphic Design","Branding","Video Editing","Photography","Consulting","Other Services","Other Income"]) await prisma.category.create({ data:{ businessId:biz.id, type:"INCOME", name:n, isSystem:true }}).catch(()=>{});
    for (const n of ["Internet","Hosting","Domain","Software","Advertising","Equipment","Transport","Electricity","Office","Communication","Maintenance","Other"]) await prisma.category.create({ data:{ businessId:biz.id, type:"BUSINESS_EXPENSE", name:n, isSystem:true }}).catch(()=>{});
    for (const n of ["Food","Transport","Shopping","Family","Entertainment","Bills","Personal","Other"]) await prisma.category.create({ data:{ businessId:biz.id, type:"PERSONAL_SPENDING", name:n, isSystem:true }}).catch(()=>{});
    return NextResponse.json({ ok:true, business: biz }, { status:201 });
  } catch (e) {
    if (String(e).includes("Can't reach")) return NextResponse.json({ ok:true, mocked:true, business:{ id:"mock-"+Date.now(), name:d.name, slug:"mock-slug" }}, { status:201 });
    console.error("business create", e);
    return NextResponse.json({ error:"Internal" }, { status:500 });
  }
}
