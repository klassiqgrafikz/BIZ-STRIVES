"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input, Button, useAuthSubmit } from "@/components/auth/AuthForm";

export default function LoginClient() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("owner@klassiqgrafikz.com");
  const [password, setPassword] = useState("Klassiq123!");
  const { submit, loading, error, info } = useAuthSubmit("/api/auth/login", { redirectTo: next as string });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit({ email, password });
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your BIZ-STRIVES workspace."
      footer={<>No account yet? <Link href="/signup" className="font-semibold text-emerald-700 hover:underline">Create workspace</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" className="rounded" /> Remember me</label>
          <Link href="/forgot-password" className="font-medium text-emerald-700 hover:underline">Forgot password?</Link>
        </div>
        {error && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
        {info && <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">{info}</p>}
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
          <p className="font-medium">Dev seed login (if DB not yet wired):</p>
          <p>owner@klassiqgrafikz.com / Klassiq123! — also creates Klassiq Grafikz workspace on signup.</p>
        </div>
        <Button type="submit" loading={loading}>Log in</Button>
      </form>
    </AuthCard>
  );
}
