"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input, Button, useAuthSubmit } from "@/components/auth/AuthForm";

export default function LoginClient() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [code, setCode] = useState("0425");
  const { submit, loading, error, info } = useAuthSubmit("/api/auth/login");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await submit({ code });
    if (result.ok) {
      router.push(next);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your BIZ-STRIVES workspace."
      footer={<>No account yet? <Link href="/signup" className="font-semibold text-emerald-700 hover:underline">Create workspace</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="4-Digit Code" type="text" value={code} onChange={(e) => setCode(e.target.value)} required />
        <div className="flex items-center justify-between text-xs">
          <Link href="/forgot-password" className="font-medium text-emerald-700 hover:underline">Forgot code?</Link>
        </div>
        {error && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
        {info && <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">{info}</p>}
        <Button type="submit">Log in</Button>
      </form>
    </AuthCard>
  );
}