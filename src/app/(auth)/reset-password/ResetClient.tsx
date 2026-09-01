"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input, Button } from "@/components/auth/AuthForm";

export default function ResetClient() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) setErr(json.error ? String(json.error).slice(0, 400) : "Invalid token");
      else {
        setMsg(json.message || "Password reset. Redirecting...");
        setTimeout(() => router.push("/login" as never), 1200);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) return <AuthCard title="Invalid link" subtitle="Missing reset token."><p className="text-sm text-slate-600">Request a new link from <Link href="/forgot-password" className="underline font-medium text-emerald-700">forgot password</Link>.</p></AuthCard>;

  return (
    <AuthCard title="Reset password" subtitle="Choose a new secure password (min 8)." footer={<Link href="/login" className="font-semibold text-emerald-700 hover:underline">Back to login</Link>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Reset token" value={token} readOnly />
        <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {err && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</p>}
        {msg && <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
        <Button type="submit" loading={loading}>Reset password</Button>
      </form>
    </AuthCard>
  );
}
