"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    const router = useRouter();
    router.push("/dashboard");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
      Redirecting to dashboard...
    </div>
  );
}