"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <input
        {...rest}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
      />
    </label>
  );
}

export function Button({ children, loading, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}

export function useAuthSubmit(url: string, opts?: { redirectTo?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(data: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ? (typeof json.error === "string" ? json.error : JSON.stringify(json.error).slice(0, 400)) : "Something went wrong");
        return { ok: false, json };
      }
      if (json.mocked) setInfo("Dev mode: operation mocked (set DATABASE_URL for persistence).");
      if (opts?.redirectTo) {
        router.push(opts.redirectTo as never);
        router.refresh();
      }
      return { ok: true, json };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }
  return { submit, loading, error, info, setError, setInfo };
}
