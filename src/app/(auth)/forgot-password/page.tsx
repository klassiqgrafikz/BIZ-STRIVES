"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input, Button } from "@/components/auth/AuthForm";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setDevUrl(null);
    try {
      const res = await fetch("/api/auth/forgot-password", { method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ email })});
      const json = await res.json();
      if (!res.ok) setMsg(json.error ? String(json.error).slice(0,300) : "Error");
      else {
        setMsg(json.message || "If that email exists, reset link sent.");
        if (json.devUrl) setDevUrl(json.devUrl);
      }
    } finally { setLoading(false); }
  }

  return (
    <AuthCard title="Forgot password" subtitle="We’ll send a secure reset link to your email." footer={<><Link href="/login" className="font-semibold text-emerald-700 hover:underline">Back to login</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" required />
        {msg && <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
        {devUrl && <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm break-all">Dev reset URL: <Link href={devUrl as never} className="underline font-medium">{devUrl}</Link></p>}
        <Button type="submit" loading={loading}>Send reset link</Button>
        <p className="text-xs text-slate-500">Link expires in 1 hour. Check Resend in production; dev stubs show link above.</p>
      </form>
    </AuthCard>
  );
}
