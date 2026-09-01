import { NextResponse } from "next/server";
import { verifyRequestAuth } from "@/lib/auth/session";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/resend";
import { notify } from "@/lib/notifications";

function isMockDb(){ const u=process.env.DATABASE_URL||""; return u.includes("user:password")||u.includes("localhost")||!u; }

// Mock birthday settings stored per business (mock)
let birthdaySettings: Record<string, unknown> = {
  enabled:true, sendOnBirthday:true, sendBeforeDays:0, channel:"Email", template:"Happy Birthday, {{name}}! Everyone at {{business}} wishes you a wonderful birthday and an amazing year ahead.", businessName:"Klassiq Grafikz",
};

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  sendOnBirthday: z.boolean().optional(),
  sendBeforeDays: z.number().int().min(0).max(7).optional(),
  channel: z.enum(["Email","WhatsApp","SMS"]).optional(),
  template: z.string().max(2000).optional(),
});

export async function GET(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {searchParams}=new URL(req.url);
  const run = searchParams.get("run")==="1"; // manual trigger to find today's birthdays and send

  if(run){
    // Find birthdays that match today (mock: John Doe May 15 not today, so simulate by using current month customers)
    if(isMockDb()){
      const today = new Date(); today.setHours(0,0,0,0);
      // Mock customers with birthdays this month
      const mockCustomers = [
        {id:"c1", fullName:"John Doe", email:"john@example.com", birthday:"1990-05-15"},
        {id:"c2", fullName:"Ada Lovelace", email:"ada@klassiq.com", birthday: new Date().toISOString().slice(0,10)}, // today for testing
      ];
      const todays = mockCustomers.filter(c=> {
        const b=new Date(c.birthday); return b.getMonth()===today.getMonth() && b.getDate()===today.getDate();
      });
      let sent=0;
      for(const c of todays){
        const personalized = String(birthdaySettings.template).replace("{{name}}", c.fullName.split(" ")[0]).replace("{{business}}", String(birthdaySettings.businessName));
        if(birthdaySettings.channel==="Email"){
          await sendEmail({to:c.email, subject:`Happy Birthday, ${c.fullName.split(" ")[0]}! — ${birthdaySettings.businessName}`, html:`<p>${personalized}</p>`});
          sent++;
        }
        await notify({businessId:"mock-biz", userId:auth.userId, type:"System", title:`Birthday sent to ${c.fullName}`, message: personalized, actionLink:`/customers/${c.id}`});
      }
      return NextResponse.json({mocked:true, ran:true, birthdaysToday: todays.length, sent, template: birthdaySettings.template});
    }
    // Real DB: query prisma.customer where birthday month/day matches today
    try{
      const now=new Date();
      const customers = await prisma.customer.findMany({where:{businessId:auth.businessId!, birthday:{not:null}}});
      const todays = customers.filter(c=> c.birthday && c.birthday.getMonth()===now.getMonth() && c.birthday.getDate()===now.getDate());
      let sent=0;
      for(const c of todays){
        const tpl = String(birthdaySettings.template);
        const business = await prisma.business.findUnique({where:{id:auth.businessId!}});
        const msg = tpl.replace("{{name}}", c.fullName.split(" ")[0]).replace("{{business}}", business?.name||"BIZ-STRIVES");
        if(birthdaySettings.channel==="Email" && c.email){
          await sendEmail({to:c.email, subject:`Happy Birthday!`, html:`<p>${msg}</p>`});
        }
        sent++;
      }
      return NextResponse.json({ran:true, birthdaysToday:todays.length, sent});
    }catch(e){ console.error(e); return NextResponse.json({error:"Internal"},{status:500});}
  }

  // Return settings
  if(isMockDb()) return NextResponse.json({mocked:true, settings: birthdaySettings});
  // Real DB could store in Business json or separate table — return mock for now
  return NextResponse.json({settings: birthdaySettings});
}

export async function PUT(req:Request){
  const auth=verifyRequestAuth(req); if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const p=settingsSchema.safeParse(body); if(!p.success) return NextResponse.json({error:p.error.flatten()},{status:400});
  birthdaySettings = {...birthdaySettings, ...p.data};
  // In real DB, persist to Business or Automation
  if(!isMockDb()){
    try{
      // Optionally update Automation for birthday
      await prisma.automation.upsert({
        where:{id:"birthday-auto-"+auth.businessId!},
        update:{enabled: !!birthdaySettings.enabled, conditions: {channel: birthdaySettings.channel, template: birthdaySettings.template} as never},
        create:{businessId:auth.businessId!, name:"Birthday automation", triggerType:"CustomerBirthday", actionType:"SendBirthdayMessage", enabled: !!birthdaySettings.enabled, conditions:{channel: birthdaySettings.channel} as never, schedule:"0 7 * * *"},
      });
    }catch{}
  }
  return NextResponse.json({ok:true, mocked: isMockDb(), settings: birthdaySettings});
}
