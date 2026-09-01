import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";

function isMockDb() { const url=process.env.DATABASE_URL||""; return url.includes("user:password")||url.includes("localhost")||!url; }

const updateSchema = z.object({ name: z.string().min(1).max(100).optional(), isArchived: z.boolean().optional() });

export async function PUT(req: Request, { params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const body = await req.json().catch(()=> ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:parsed.error.flatten()}, { status:400 });
  if (isMockDb()) return NextResponse.json({ ok:true, mocked:true });

  try {
    const existing = await prisma.category.findFirst({ where:{ id, businessId: auth.businessId! }});
    if (!existing) return NextResponse.json({ error:"Not found" }, { status:404 });
    // System categories can be archived but not renamed to preserve history clarity
    if (existing.isSystem && parsed.data.name && parsed.data.name !== existing.name) {
      return NextResponse.json({ error:"System categories can only be archived, not renamed" }, { status:400 });
    }
    const updated = await prisma.category.update({ where:{ id }, data:{ ...(parsed.data.name?{name:parsed.data.name.trim()}:{}), ...(parsed.data.isArchived!==undefined?{isArchived:parsed.data.isArchived}:{}) }});
    return NextResponse.json({ ok:true, category: updated });
  } catch (e) { console.error(e); return NextResponse.json({ error:"Internal" }, { status:500 }); }
}
