// Nodemailer Gmail SMTP — Production email transport
// Vercel-unified: uses GMAIL_USER + GMAIL_APP_PASSWORD env
// Replace/reset Resend env vars after deploying (RESEND_API_KEY still loaded but ignored)

import nodemailer from "nodemailer";

// Create reusable transporter using Gmail SMTP
// Port 465 = SSL, Port 587 = STARTTLS — we use 465 with secure: true
export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for 587 with STARTTLS
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Send email via Gmail SMTP
// Same params as old Resend version: { to, subject, html, text?, attachments? }
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const info = await transporter.sendMail({
      from: `BIZ-STRIVES <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(params.attachments && { attachments }),
    });
    return { ok: true, id: info.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

// monthlyStatementHtml — unchanged from original, kept for parity
export function monthlyStatementHtml(opts: {
  businessName: string;
  periodLabel: string;
  summary: { totalIncome: number; businessExpenses: number; personalSpending: number; moneyRemaining: number; availableMoney: number; reservedSavings: number };
  currencySymbol?: string;
}): string {
  const s = opts.currencySymbol ?? "₦";
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
    <h1 style="color:#166534;margin:0">BIZ-STRIVES</h1>
    <p style="color:#475569;margin:4px 0 16px">${opts.businessName} — Monthly Statement</p>
    <h2 style="color:#0f172a;">${opts.periodLabel}</h2>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Total Money Received</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${s}${opts.summary.totalIncome.toLocaleString()}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Business Expenses</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#dc2626">-${s}${opts.summary.businessExpenses.toLocaleString()}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Personal Spending</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#dc2626">-${s}${opts.summary.personalSpending.toLocaleString()}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:700">Money Remaining</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">${s}${opts.summary.moneyRemaining.toLocaleString()}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Reserved Savings</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#2563eb">${s}${opts.summary.reservedSavings.toLocaleString()}</td></tr>
      <tr><td style="padding:8px;font-weight:700">Available Money</td><td style="padding:8px;text-align:right;font-weight:700;color:#16a34a">${s}${opts.summary.availableMoney.toLocaleString()}</td></tr>
    </table>
    <p style="margin-top:20px;color:#64748b;font-size:12px;">Detailed PDF statement attached. This is an automated BIZ-STRIVES report.</p>
  </div>`;
}