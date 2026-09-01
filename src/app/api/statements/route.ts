import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isMockDb()){
    return NextResponse.json({
      mocked:true,
      statements:[
        {id:"s1", businessId:"mock-biz", periodId:"mp-aug2026", year:2026, month:8, status:"Closed", pdfUrl:"/api/statements/s1?format=pdf", csvUrl:"/api/statements/s1?format=csv", generatedAt:"2026-08-31T22:00:00Z"},
        {id:"s2", businessId:"mock-biz", periodId:"mp-sep2026", year:2026, month:9, status:"Open", pdfUrl:null, csvUrl:null, generatedAt:null},
      ],
      archive: { "2026": [{month:8, name:"August", status:"Closed"}, {month:9, name:"September", status:"Open"}] }
    });
  }
  try{
    const statements = await prisma.statement.findMany({where:{businessId:auth.businessId!}, include:{period:true}, orderBy:{generatedAt:"desc"}});
    // Build archive map
    const archive: Record<string, Array<{month:number; name:string; status:string}>> = {};
    const periods = await prisma.monthlyPeriod.findMany({where:{businessId:auth.businessId!}, orderBy:[{year:"desc"},{month:"desc"}]});
    for(const p of periods){
      const y=String(p.year);
      if(!archive[y]) archive[y]=[];
      archive[y].push({month:p.month, name:new Date(p.year, p.month-1,1).toLocaleDateString("en-NG",{month:"long"}), status:p.status});
    }
    return NextResponse.json({statements, archive});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
