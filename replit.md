# Nexvault — Digital Banking Platform

## Overview

Full-stack fintech platform (Nexvault) built as a pnpm monorepo. Inspired by modern digital banking UX (Arival Bank, Wise, Revolut) with original branding. Deep navy + crisp teal design system.

## Architecture

```
artifacts/
  api-server/          Express 5 REST API (port 8080)
  nexvault-web/        React + Vite web app (port 23553 → external 3000)
  mockup-sandbox/      UI sandbox (port 8081)

lib/
  api-spec/            OpenAPI YAML spec (source of truth)
  api-client-react/    Generated React Query hooks (Orval codegen)
  api-zod/             Generated Zod schemas (Orval codegen)
  db/                  Drizzle ORM schema + PostgreSQL client

config/
  onboarding/
    individual-flow.json   KYC onboarding decision tree (individual)
    business-flow.json     KYC onboarding decision tree (business)

docs/
  feature-map.md           Feature research + competitive analysis
  architecture-hypotheses.md
  system-design.md
  microservices.md
  decision-tree.md
```

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **API**: Express 5, JWT auth (bcrypt, jsonwebtoken), cookie-parser
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (v4), drizzle-zod
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui components, wouter router
- **Build**: esbuild (API), Vite (web)

## API Routes (all prefixed `/api`)

### Auth
- `POST /auth/register` — create account (auto-verifies email in dev)
- `POST /auth/login` — returns JWT access token + sets httpOnly refresh cookie
- `POST /auth/refresh` — exchange refresh token for new access token
- `POST /auth/logout` — clears session
- `POST /auth/otp/request` — request OTP (dev: use 123456)

### Accounts
- `GET /accounts` — list user accounts
- `POST /accounts` — create account (currency: USD|EUR|GBP|SGD|AED)
- `GET /accounts/summary` — overview with balances, recent txs, spend stats
- `GET /accounts/:id` — single account
- `GET /accounts/:id/transactions` — paginated transactions

### Cards
- `GET /cards` — list cards
- `POST /cards` — issue card (virtual or physical)
- `PUT /cards/:id/freeze` / `PUT /cards/:id/unfreeze`

### Payments
- `GET /payments/beneficiaries` / `POST /payments/beneficiaries`
- `GET /payments/fx/quote?from=USD&to=EUR&amount=1000` — FX quote (0.5% fee)
- `POST /payments/transfer/initiate` — stage a transfer (returns transferId)
- `POST /payments/transfer/confirm` — confirm with OTP (dev: 123456)
- `GET /payments/transfers` — transfer history

### Onboarding (KYC)
- `POST /onboarding/start` — starts flow (individual or business)
- `POST /onboarding/step` — submit a step; auto-approves and provisions 3 accounts in dev
- `GET /onboarding/status`

### Other
- `GET /users/me` / `GET /users/me/activity`
- `GET /notifications` / `PUT /notifications/read-all`

## Web App Pages

- `/` — Landing page
- `/register` — Registration
- `/login` — Login
- `/onboarding` — Multi-step KYC onboarding flow
- `/dashboard` — Overview with balances, recent transactions, cards
- `/accounts` — Multi-currency accounts list
- `/accounts/:id` — Account detail + transaction history
- `/cards` — Card management (freeze/unfreeze, issue new)
- `/payments` — Send money (add beneficiaries, FX, confirm with OTP)
- `/payments/history` — Transfer history
- `/notifications` — Notification center
- `/settings` — Profile, KYC status, sign out

## Dev Notes

- JWT secret defaults to `"nexvault-dev-secret-change-in-prod"` → set `SESSION_SECRET` in prod
- Access token: 15min TTL; refresh token: 30 days (httpOnly cookie)
- Onboarding auto-approves KYC and provisions USD ($12,500), EUR (€8,200), GBP (£3,750) demo accounts
- FX rates are hardcoded demo rates; fee = 0.5% of transfer amount
- Vite proxy: `/api` → `localhost:8080`

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server

## Ports

- API server: 8080 (external: 8080)
- Web app: 23553 (external: 3000 / preview)
- Mockup sandbox: 8081 (external: 80)
