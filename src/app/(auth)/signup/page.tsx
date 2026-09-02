"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";

export default function SignupPage() {
  return (
    <AuthCard
      title="BIZ-STRIVES Dashboard"
      subtitle="Finance management for Klassiq Grafikz"
    >
      <p className="text-center my-8">Welcome to BIZ-STRIVES</p>
      <p className="text-center text-slate-500">Hardcoded auth mode has been removed. You can now access the dashboard directly.</p>
      <div className="mt-6">
        <p className="text-xs text-slate-400 text-center">All 30 phases are now accessible without authentication.</p>
      </div>
      <p className="text-xs text-slate-400 text-center">Platform: BIZ-STRIVES v0.1.0-phase0</p>
    </AuthCard>
  );
}