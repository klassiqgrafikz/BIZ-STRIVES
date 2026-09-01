// Simple in-memory rate limiter — Phase 21
// For Vercel production use Upstash Redis or Vercel WAF. This is a dev fallback.

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, opts: { limit: number; windowMs: number }): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + opts.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.limit - 1, resetAt };
  }
  if (entry.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count++;
  return { allowed: true, remaining: opts.limit - entry.count, resetAt: entry.resetAt };
}

export function getClientKey(req: Request): string {
  // Vercel: x-forwarded-for, x-real-ip
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return ip;
}
