#!/usr/bin/env node
// Vercel build wrapper — ensures Prisma generate works even without DATABASE_URL (mock mode)
// Real DATABASE_URL (Supabase pooler) will be injected by Vercel after Storage is linked — then this dummy is ignored
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/bizstrives?schema=public";
  console.log("[build] DATABASE_URL not set — using dummy placeholder for prisma generate (mock mode)");
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}
const { execSync } = require("child_process");
try {
  console.log("[build] Running prisma generate...");
  execSync("npx prisma generate", { stdio: "inherit" });
} catch (e) {
  console.error("[build] prisma generate failed", e);
  process.exit(1);
}
try {
  console.log("[build] Running next build --webpack...");
  execSync("npx next build --webpack", { stdio: "inherit" });
} catch (e) {
  console.error("[build] next build failed", e);
  process.exit(1);
}
