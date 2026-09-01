import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

function isMockDb() {
  const url = process.env.DATABASE_URL || "";
  return url.includes("user:password") || url.includes("localhost") || !url;
}

const mockCustomers: Array<Record<string, unknown>> = [
  { id:"c1", businessId:"mock-biz", fullName:"John Doe", email:"john@example.com", phone:"+2348012345678", company:"Doe Enterprises", birthday:"1990-05-15", address:"Lagos, Nigeria", notes:"VIP client", createdAt:"2026-01-10T00:00:00Z" },
  { id:"c2", businessId:"mock-biz", fullName:"Ada Lovelace", email:"ada@klassiq.com", phone:"+2348020000000", company:"Klassiq Grafikz", birthday:"1995-09-12", address:"Lagos", notes:"Referral", createdAt:"2026-02-01T00:00:00Z" },
];

const createSchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().max(30).optional().nullable(),
  company: z.string().max(100).optional().nullable(),
  birthday: z.string().optional().nullable(), // YYYY-MM-DD
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() || "";
  const type = searchParams.get("birthdayThisMonth") ? "birthday" : null;

  if (isMockDb()) {
    let filtered = [...mockCustomers];
    if (q) filtered = filtered.filter(c=> [c.fullName,c.email,c.phone,c.company].some(v=> String(v||"").toLowerCase().includes(q)));
    if (type==="birthday") {
      const m = new Date().getMonth()+1;
      filtered = filtered.filter(c=> c.birthday && new Date(c.birthday as string).getMonth()+1===m);
    }
    return NextResponse.json({ mocked:true, customers: filtered, count: filtered.length });
  }

  try {
    const businessId = auth.businessId!;
    const where: Record<string, unknown> = { businessId };
    if (q) {
      (where as Record<string, unknown>).OR = [
        { fullName: { contains: q, mode:"insensitive" }},
        { email: { contains: q, mode:"insensitive" }},
        { phone: { contains: q, mode:"insensitive" }},
        { company: { contains: q, mode:"insensitive" }},
      ];
    }
    const customers = await prisma.customer.findMany({ where: where as never, orderBy:{ createdAt:"desc" }, take:100 });
    return NextResponse.json({ customers, count: customers.length });
  } catch(e){ console.error(e); return NextResponse.json({ error:"Internal" }, { status:500 });}
}

export async function POST(req: Request) {
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const body = await req.json().catch(()=> ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:parsed.error.flatten()}, { status:400 });

  if (isMockDb()) {
    const c = { id:"mock-c-"+Date.now(), businessId:"mock-biz", ...parsed.data, birthday: parsed.data.birthday||null, createdAt:new Date().toISOString() };
    mockCustomers.unshift(c);
    return NextResponse.json({ ok:true, mocked:true, customer:c }, { status:201 });
  }

  try {
    const d = parsed.data;
    const customer = await prisma.customer.create({
      data:{
        businessId: auth.businessId!,
        fullName: d.fullName.trim(),
        email: d.email||null,
        phone: d.phone||null,
        company: d.company||null,
        birthday: d.birthday ? new Date(d.birthday) : null,
        address: d.address||null,
        notes: d.notes||null,
      }
    });
    await auditLog({ businessId: auth.businessId!, userId: auth.userId, action:"customer.created", entity:"Customer", entityId:customer.id, after:customer });
    return NextResponse.json({ ok:true, customer }, { status:201 });
  } catch(e){ console.error(e); return NextResponse.json({ error:"Internal" }, { status:500 });}
}
