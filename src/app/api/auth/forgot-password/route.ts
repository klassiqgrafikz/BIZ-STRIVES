import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/resend";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(()=> ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });

  const email = parsed.data.email.toLowerCase().trim();
  try {
    const user = await prisma.user.findUnique({ where:{ email }});
    // Always return success to avoid enumeration
    if (!user) return NextResponse.json({ ok:true, message:"If that email exists, a reset link has been sent." });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000*60*60); // 1h
    await prisma.verificationToken.create({ data:{ userId:user.id, token, type:"PasswordReset", expiresAt }});

    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    const html = `<p>Hello ${user.name || "there"},</p><p>You requested a password reset for BIZ-STRIVES.</p><p><a href="${resetUrl}" style="background:#16a34a;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;">Reset Password</a></p><p>Or copy: ${resetUrl}</p><p>This link expires in 1 hour.</p>`;
    await sendEmail({ to: email, subject:"Reset your BIZ-STRIVES password", html, text:`Reset: ${resetUrl}` });

    // In dev, also return token for clickable testing
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ ok:true, message:"If that email exists, a reset link has been sent.", ...(isDev ? { devToken: token, devUrl: resetUrl } : {}) });
  } catch (e) {
    if (String(e).includes("Can't reach") || String(e).includes("DATABASE_URL")) {
      return NextResponse.json({ ok:true, mocked:true, message:"DB not configured — dev mock. Reset link would be emailed in production." });
    }
    console.error("forgot error", e);
    return NextResponse.json({ error:"Internal" }, { status:500 });
  }
}
