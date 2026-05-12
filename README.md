# Dranzo Payments

Multi-tenant client subscription, billing, reminder & compliance management platform.

> **Status:** Slice 1 — Foundations (Auth, Organization onboarding, User Settings, RBAC, Audit log).

## Stack

| Layer | Choice |
|---|---|
| API | NestJS 10 + TypeScript |
| ORM | TypeORM 0.3 |
| DB | MySQL 8 |
| Jobs | `@nestjs/schedule` + idempotency table (Redis-free v1) |
| Auth | Passport JWT (access + refresh) + bcrypt |
| Web | Vite + React 18 + TS + Tailwind + shadcn/ui + TanStack Query + Zustand |
| PDF | Handlebars → Puppeteer (Slice 6) |

## Repo layout

```
apps/
  api/    NestJS API
  web/    Vite React SPA
docs/     architecture + runbooks
```

## Prerequisites

- Node 20+
- npm 10+
- A reachable MySQL 8 instance with a `dp` schema

## Bring-up

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# edit .env — set DB_HOST/DB_USER/DB_PASSWORD/DB_NAME plus JWT secrets

# 3. Run migrations
npm run migration:run

# 4. (Optional) Seed demo org
npm run seed

# 5. Start both apps
npm run dev
# API:  http://localhost:4000
# Web:  http://localhost:5173
```

## Slice 1 — How to verify

1. Open `http://localhost:5173/register`
2. Sign up — your account becomes Admin of a new Organization
3. Go to **Settings → Organization** → upload logo URL, set GSTIN, invoice prefix, bank details
4. Go to **Team** → invite a teammate as `Finance`
5. Open the invite link in an incognito window → accept → login
6. Confirm Finance user **cannot** see the Team page (RBAC working)
7. Open **Audit Log** as Admin → every action above is recorded

## Security notes

- `.env` is gitignored. Never commit real credentials.
- DB user should be a least-privilege app user (`dranzo_app`), not `root`.
- JWT secrets must be 32+ random bytes per environment.
- Bcrypt rounds default to 12; raise to 14 for prod.

## Roadmap

See `docs/data-model.md` and the master spec in chat history.

| Slice | Scope | Status |
|---|---|---|
| 1 | Auth, Org, Settings, RBAC, Audit | 🚧 in progress |
| 2 | Clients + Contacts + Tags | ⏳ |
| 3 | Catalog + 12 pricing models | ⏳ |
| 4 | Subscriptions | ⏳ |
| 5 | Scheduler + Reminders + Kanban | ⏳ |
| 6 | Invoices + PDF + email | ⏳ |
| 7 | Payments + Mark Paid + cycle roll-forward | ⏳ |
| 8 | Compliance calendar | ⏳ |
| 9 | Reports + Dashboard | ⏳ |
| 10 | Integrations (Slack/Teams, calendar, gateways) | ⏳ |
