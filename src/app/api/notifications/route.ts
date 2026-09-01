import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyRequestAuth } from "@/lib/auth/session";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

const mockNotifications = [
  {id:"n1", type:"MoneyReceived", title:"₦200,000 received", message:"Hey! You just received ₦200,000 from John Doe. Want to allocate this money?", read:false, createdAt:new Date().toISOString(), actionLink:"/transactions"},
  {id:"n2", type:"InvoiceOverdue", title:"Invoice INV-002 is overdue", message:"Ada Lovelace — INV-002 (₦290,000) was due Sep 20.", read:false, createdAt:new Date(Date.now()-86400000).toISOString(), actionLink:"/invoices"},
  {id:"n3", type:"SavingsDue", title:"Your weekly savings contribution is due", message:"Emergency Fund — weekly savings of ₦10,000 is due today.", read:false, createdAt:new Date(Date.now()-2*86400000).toISOString(), actionLink:"/savings"},
  {id:"n4", type:"StatementGenerated", title:"August statement has been generated", message:"Your August 2026 statement is ready. PDF attached.", read:true, createdAt:"2026-08-31T22:00:00Z", actionLink:"/statements"},
  {id:"n5", type:"MonthlyReportReady", title:"Your monthly report is ready", message:"September report: Money In ₦500k, Remaining ₦350k", read:true, createdAt:new Date().toISOString(), actionLink:"/reports"},
];

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {searchParams}=new URL(req.url); const unreadOnly=searchParams.get("unread")==="1";
  if(isMockDb()){
    const filtered = unreadOnly? mockNotifications.filter(n=> !n.read): mockNotifications;
    return NextResponse.json({mocked:true, notifications: filtered, unreadCount: mockNotifications.filter(n=> !n.read).length});
  }
  try{
    const where:Record<string,unknown>={businessId:auth.businessId!};
    if(unreadOnly) (where as Record<string,unknown>).read=false;
    const notifs = await prisma.notification.findMany({where: where as never, orderBy:{createdAt:"desc"}, take:50});
    const unreadCount = await prisma.notification.count({where:{businessId:auth.businessId!, read:false}});
    return NextResponse.json({notifications: notifs, unreadCount});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function POST(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const {type="System", title, message, actionLink} = body as {type?:string; title?:string; message?:string; actionLink?:string};
  if(!title || !message) return NextResponse.json({error:"title and message required"},{status:400});
  if(isMockDb()){
    const n={id:"mock-n-"+Date.now(), type, title, message, read:false, createdAt:new Date().toISOString(), actionLink:actionLink||null};
    mockNotifications.unshift(n as never);
    return NextResponse.json({ok:true, mocked:true, notification:n},{status:201});
  }
  try{
    const n = await prisma.notification.create({data:{businessId:auth.businessId!, userId:auth.userId, type: type as never, title, message, actionLink:actionLink||null}});
    return NextResponse.json({ok:true, notification:n},{status:201});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}

export async function PUT(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const {ids, markAll, read=true} = body as {ids?:string[]; markAll?:boolean; read?:boolean};
  if(isMockDb()){
    if(markAll) mockNotifications.forEach(n=> (n as Record<string,unknown>).read = read);
    else if(ids) mockNotifications.forEach(n=> { if(ids.includes(n.id)) (n as Record<string,unknown>).read=read; });
    return NextResponse.json({ok:true, mocked:true});
  }
  try{
    if(markAll) await prisma.notification.updateMany({where:{businessId:auth.businessId!}, data:{read}});
    else if(ids && ids.length) await prisma.notification.updateMany({where:{id:{in:ids}, businessId:auth.businessId!}, data:{read}});
    else return NextResponse.json({error:"Provide ids or markAll"},{status:400});
    return NextResponse.json({ok:true});
  }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
}
