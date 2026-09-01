# BIZ-STRIVES — Deploy to Vercel (Unified)

**Stack:** Next.js 16 (App Router) + Prisma + PostgreSQL + Resend + Vercel Cron — single platform per your choice (`vercel-unified`).

---

## 1) Push to GitHub (one-time)

In **C:\MY WEBSITES\BIZ STRIVES** (this folder is currently **not** a git repo):

```powershell
# 1. Initialize
git init
git add .
git commit -m "BIZ-STRIVES — Phases 0-30 complete (Vercel-unified)"

# 2. Create a blank GitHub repo (https://github.com/new) — e.g. biz-strives
# 3. Add remote and push
git branch -M main
git remote add origin https://github.com/<your-username>/biz-strives.git
git push -u origin main
```

> `.gitignore` already ignores `.env`, `node_modules`, `.next`; `.env.example` is the template to copy on Vercel.

---

## 2) Import to Vercel

1. **vercel.com → Add New Project → Import** your `biz-strives` repo.
2. **Framework: Next.js** auto-detected. Keep defaults.
3. **Root Directory:** leave `.` (the repo root is `biz-strives`).
4. Click **Deploy** — first build will run `postinstall: prisma generate` + `build: prisma generate && next build --webpack` (see `package.json:6-9`).

---

## 3) Add Vercel Storage (one-click)

Before the DB will persist (currently mocked via `user:password` placeholder), add:

**Vercel Dashboard → Project → Storage:**

| Service | How | Env vars auto-injected |
|---------|-----|------------------------|
| **Postgres** (Neon) | Create → Choose **Pooled** (serverless) + **Direct** | `DATABASE_URL`, `POSTGRES_URL`, `DIRECT_URL` |
| **KV (Upstash Redis)** | Create (Marketplace) | `KV_URL`, `REDIS_URL` |
| **Blob** (for PDFs) | Create | `BLOB_READ_WRITE_TOKEN` |

After creating Postgres, **Redeploy** (Deployments → … → Redeploy) so the build picks up the new `DATABASE_URL` and runs `vercel-build: prisma db push`.

---

## 4) Environment Variables (Project → Settings → Environment Variables)

Add these (values from `.env.example:1`):

| Key | Where to get |
|-----|--------------|
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `REFRESH_SECRET` | same |
| `NEXTAUTH_SECRET` | same |
| `NEXTAUTH_URL` | `https://<your-project>.vercel.app` |
| `RESEND_API_KEY` | https://resend.com/api-keys (`re_xxx`) |
| `RESEND_FROM` | `BIZ-STRIVES <noreply@yourdomain.com>` (verify domain in Resend) |
| `CRON_SECRET` | optional — `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"` — if set, Vercel sends `Authorization: Bearer <secret>` to crons |

> `DATABASE_URL`, `REDIS_URL`, `BLOB_READ_WRITE_TOKEN` are auto-set by Storage — don't overwrite.

---

## 5) Database Setup

Vercel's `vercel-build` runs: `prisma generate && prisma db push --accept-data-loss && next build --webpack` (`package.json:10`).

- **First deploy** creates all 18 tables (User, Business, Account, Transaction, Customer, Project, Invoice, SavingsGoal, MonthlyPeriod, Statement, Notification, Automation, AuditLog, EmailLog, VerificationToken, etc.) — see `prisma/schema.prisma:1`
- **Seed** Klassiq Grafikz demo (optional, after first deploy → Project → Settings → Functions → run once or locally):
  ```bash
  npm run db:seed  # creates Owner user owner@klassiqgrafikz.com / Klassiq123! + Klassiq Grafikz + seeded categories/accounts
  ```
  Or set `DATABASE_URL` locally to the pooled URL and run `npm run db:push && npm run db:seed`.

---

## 6) Crons

**`vercel.json:4-13`:**
```json
{ "path": "/api/crons/month-end", "schedule": "0 22 * * *" },
{ "path": "/api/crons/birthday", "schedule": "0 7 * * *" }
```
- `month-end` runs **22:00 UTC (~23:00 Lagos)** daily, checks if last day of month → close period → statement → email → notification (`src/app/api/crons/month-end/route.ts:1`)
- `birthday` runs **07:00 UTC** → scans `birthday = today` → personalizes `{{name}}/{{business}}` → Resend + Notification (`src/app/api/birthday/route.ts:1`)
- Test manually: `https://<project>.vercel.app/api/crons/month-end?force=1` + header `Authorization: Bearer $CRON_SECRET` (if set).

---

## 7) Verify After Deploy

```bash
curl https://<project>.vercel.app/api/health
# → { app:"BIZ-STRIVES", deployment:"vercel-unified", prismaOk:true, ... }

# Auth flow
curl -X POST https://<project>.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"Test12345!","businessName":"Klassiq Grafikz"}'

# Business settings, transactions, statements all live once DATABASE_URL is real (no more mocked:true)
```

**Clickable mockups (when `DATABASE_URL` was mocked, all APIs returned `mocked:true` so UI stayed testable):**
- `/` landing + pricing `/pricing`
- `/signup` → `/login` → `/dashboard` (8 cards live via `/api/transactions?period=thisMonth` + savings)
- `/transactions`, `/accounts` (transfers not income), `/savings`, `/customers`, `/projects`, `/invoices`, `/statements` (close/reopen audit), `/reports`, `/communications`, `/automations`, `/search` + CSV export, `/notifications`, `/audit`, `/settings/business` (statementEmail toggle)

---

## 8) Custom Domain (optional)

Project → Settings → Domains → Add `bizstrives.com` (or subdomain) → verify DNS → set `NEXTAUTH_URL` to that domain and redeploy.

---

## 9) Local ↔ Vercel parity

```bash
# Pull Vercel env locally
vercel link   # connect folder to project
vercel env pull .env.local
npm run dev -- --webpack  # http://localhost:3000
```

---

## Checklist

- [ ] GitHub repo pushed
- [ ] Vercel project imported & first build green
- [ ] Postgres (pooled) created & redeployed → `prismaOk:true` in `/api/health`
- [ ] `JWT_SECRET` / `RESEND_API_KEY` / `NEXTAUTH_URL` set
- [ ] Seed Klassiq Grafikz (or signup flow creates it)
- [ ] Test cron `?force=1` + check `/api/notifications` + `/api/email`
- [ ] Add custom domain & update `RESEND_FROM` domain verification

**Need help?** Check `vercel.json:1`, `prisma/schema.prisma:1`, `.env.example:1`, `src/lib/finance/calculations.ts:1` (central engine: `TOTAL INCOME - BUSINESS - PERSONAL = REMAINING`).
