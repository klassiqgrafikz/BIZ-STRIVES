# BIZ-STRIVES

**Simple, scalable business finance management.** Personal-use first (Klassiq Grafikz), multi-business/ multi-user ready. **Vercel-unified** deploy.

**Core engine (single source):** `TOTAL MONEY RECEIVED − BUSINESS EXPENSES − PERSONAL SPENDING = MONEY REMAINING` • Savings is *reserved* (not expense) → `Available = Remaining − Reserved` • Transfers ≠ income/expense

See `BIZ-STRIVES_Complete_Development_Phases-2.txt:1` for 30-phase spec + `DEPLOY.md:1` for Vercel steps.

Quick start (Vercel): Import repo → Create Postgres/KV/Blob (Storage) → add `JWT_SECRET`/`RESEND_API_KEY` in Settings → Redeploy. Local: `npm install && cp .env.example .env.local && npm run dev -- --webpack`.

Routes: `/` `/pricing` `/dashboard` `/transactions` `/accounts` `/savings` `/customers` `/projects` `/invoices` `/reports` `/statements` `/communications` `/automations` `/search` `/notifications` `/audit` + 36 APIs under `/api/*`.
