import { NextResponse } from "next/server";
import { verifyRequestAuth } from "@/lib/auth/session";
import { z } from "zod";
import { sendEmail } from "@/lib/email/resend";
import prisma from "@/lib/db/prisma";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

// Mock communications store
const mockComms: Array<Record<string,unknown>> = [
  {id:"comm1", businessId:"mock-biz", type:"MonthlyAppreciation", segment:"all", subject:"Thank you — August", body:"Dear {{name}}, thank you for being a valued client. — Klassiq Grafikz", status:"Sent", recipients:2, createdAt:"2026-08-31T10:00:00Z"},
  {id:"comm2", businessId:"mock-biz", type:"InvoiceReminder", segment:"outstandingInvoices", subject:"Reminder: INV-002 due", body:"Hi {{name}}, friendly reminder INV-002 (₦290k) due Sep 20.", status:"Draft", recipients:1, createdAt:"2026-09-10T09:00:00Z"},
];

const segments = [
  {id:"all", label:"All customers"},
  {id:"activeThisMonth", label:"Customers active this month"},
  {id:"paidThisMonth", label:"Customers who paid this month"},
  {id:"outstandingInvoices", label:"Customers with outstanding invoices"},
  {id:"activeProjects", label:"Customers with active projects"},
];

const createSchema = z.object({
  type: z.enum(["MonthlyAppreciation","BirthdayMessage","PaymentConfirmation","InvoiceReminder","ProjectUpdate","CustomCampaign"]),
  segment: z.enum(["all","activeThisMonth","paidThisMonth","outstandingInvoices","activeProjects","custom"]).default("all"),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  recipientIds: z.array(z.string()).optional(), // if custom, specific customer ids
  sendNow: z.boolean().optional().default(false),
});

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {searchParams}=new URL(req.url);
  const type=searchParams.get("type");
  // For mock, filter by type
  if(isMockDb()){
    let filtered=[...mockComms];
    if(type) filtered=filtered.filter(c=> c.type===type);
    return NextResponse.json({mocked:true, communications: filtered, segments, templates:[
      {type:"MonthlyAppreciation", body:"Dear {{name}}, thank you for choosing {{business}} this month!"},
      {type:"BirthdayMessage", body:"Happy Birthday, {{name}}! Everyone at {{business}} wishes you a wonderful birthday and an amazing year ahead."},
      {type:"PaymentConfirmation", body:"Hi {{name}}, we received your payment of {{amount}}. Thank you!"},
    ]});
  }
  // Real DB would query a Communication model; fallback to empty
  return NextResponse.json({communications:[], segments});
}

export async function POST(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=createSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  const d=p.data;

  if(isMockDb()){
    // Resolve recipients via segment (mock logic)
    let count=2;
    if(d.segment==="outstandingInvoices") count=1;
    if(d.segment==="custom" && d.recipientIds) count=d.recipientIds.length;
    const comm={id:"mock-comm-"+Date.now(), businessId:"mock-biz", type:d.type, segment:d.segment, subject:d.subject, body:d.body, status: d.sendNow? "Sent":"Draft", recipients: count, createdAt:new Date().toISOString()};
    mockComms.unshift(comm as never);
    if(d.sendNow){
      // Simulate sending via Resend to each segment member (mock)
      const recipients = d.segment==="all"? ["john@example.com","ada@klassiq.com"] : ["john@example.com"];
      for(const to of recipients){
        const personalized = d.body.replace("{{name}}","Friend").replace("{{business}}","Klassiq Grafikz");
        await sendEmail({to, subject:d.subject, html:`<p>${personalized}</p>`, text:personalized});
      }
    }
    return NextResponse.json({ok:true, mocked:true, communication: comm, sent: d.sendNow});
  }

  // Real DB path — would create Communication + EmailLogs
  return NextResponse.json({ok:true, message:"Created (real DB not mocked)"});
}
