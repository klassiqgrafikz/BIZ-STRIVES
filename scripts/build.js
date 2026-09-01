#!/usr/bin/env node
// Vercel build wrapper — ensures Prisma generate works even without DATABASE_URL (mock mode)
// Real DATABASE_URL (Supabase pooler) will be injected by Vercel after Storage is linked — then this dummy is ignored
require("dotenv").config();
const { execSync } = require("child_process");

// Check for real Supabase DATABASE_URL before setting dummy
// Patterns: contains pooler.supabase.com (pooler) or direct supabase.com (direct)
const realDbPatterns = ["pooler.supabase.com", "supabase.com:5432"];
const dbUrl = process.env.DATABASE_URL || "";
const isRealDb = realDbPatterns.some((pat) => dbUrl.includes(pat));

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/bizstrives?schema=public";
  console.log("[build] DATABASE_URL not set — using dummy placeholder for prisma generate (mock mode)");
} else if (!isRealDb) {
  // DATABASE_URL is set but not a real Supabase URL — keep it as-is (may be for other providers)
  console.log("[build] DATABASE_URL set but not recognized as Supabase — using as provided");
}

// Set DIRECT_URL if not already
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

console.log("[build] DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 40) + "...");
console.log("[build] isRealDb:", isRealDb);

try {
  console.log("[build] Running prisma generate...");
  execSync("npx prisma generate", { stdio: "inherit" });
} catch (e) {
  console.error("[build] prisma generate failed", e);
  process.exit(1);
}

if (isRealDb) {
  try {
    console.log("[build] DATABASE_URL is real (Supabase) — running prisma db push...");
    execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
    console.log("[build] prisma db push OK — tables ready");
  } catch (e) {
    console.warn("[build] prisma db push failed (may already be synced)", e.message);
    // don't fail build — continue to next build
  }
} else {
  console.log("[build] Not a real Supabase DATABASE_URL — skipping prisma db push (mock mode, UI still works)");
}

try {
  console.log("[build] Running next build --webpack...");
  execSync("npx next build --webpack", { stdio: "inherit" });
} catch (e) {
  console.error("[build] next build failed", e);
  process.exit(1);
}