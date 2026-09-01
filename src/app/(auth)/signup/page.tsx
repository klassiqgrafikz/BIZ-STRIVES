"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input, Button, useAuthSubmit } from "@/components/auth/AuthForm";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("Klassiq Grafikz");
  const { submit, loading, error, info } = useAuthSubmit("/api/auth/signup", { redirectTo: "/dashboard" });
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit({ name, email, password, businessName });
    if (r?.ok) setDone(true);
  }

  return (
    <AuthCard
      title="Create your workspace"
      subtitle="One account → your business finance hub. Owner role by default."
      footer={
        <>
          Already have an account? <Link href="/login" className="font-semibold text-emerald-700 hover:underline">Log in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <Input label="Password (min 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
        <Input label="Business / Workspace name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Klassiq Grafikz" required />
        <p className="text-xs text-slate-500">You’ll be Owner. Add team later (Admin/Accountant/Staff/Viewer). Currency defaults to NGN, timezone Africa/Lagos — configurable in Settings.</p>
        {error && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
        {info && <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">{info}</p>}
        {done && <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">Account created — redirecting to dashboard…</p>}
        <Button type="submit" loading={loading}>Create workspace</Button>
        <p className="text-xs text-slate-400 text-center">By signing up you agree to BIZ-STRIVES handling your finance data securely.</p>
      </form>
    </AuthCard>
  );
}
