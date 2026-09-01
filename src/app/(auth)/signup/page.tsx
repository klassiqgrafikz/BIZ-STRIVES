"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your workspace"
      subtitle="One account → your business finance hub. Owner role by default."
      footer={
        <>
          Already have an account? <Link href="/login" className="font-semibold text-emerald-700 hover:underline">Log in with code 0425</Link>
        </>
      }
    >
      <p className="text-center my-8">Hardcoded Auth Mode</p>
      <p className="text-center text-slate-500">Signup is disabled in this mode. Use the login form below with code: <strong>0425</strong></p>
      <div className="mt-6">
        <Button disabled>Create workspace</Button>
      </div>
      <p className="text-xs text-slate-400 text-center">By using this system you agree to the hardcoded auth terms.</p>
    </AuthCard>
  );
}