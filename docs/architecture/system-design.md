# System Design — Nexvault

## Overview

Nexvault is a multi-currency digital banking platform for global entrepreneurs and digital nomads. It provides individual and business accounts with IBAN issuance, debit cards, international transfers, and a KYC-compliant onboarding flow.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌────────────────────┐       ┌─────────────────────────────┐   │
│  │   Web App (React)  │       │  Mobile App (React Native)  │   │
│  │  arivalbank style  │       │   iOS + Android             │   │
│  └─────────┬──────────┘       └──────────────┬──────────────┘   │
└────────────┼──────────────────────────────────┼─────────────────┘
             │                                  │
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Gateway Layer                         │
│    Rate Limiting · Auth · Request Routing · TLS Termination     │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Auth Service │   │Onboarding Service│   │ Account Service  │
│  (SSO/JWT)   │   │  (KYC/IDV flow)  │   │ (accounts/IBAN)  │
└──────┬───────┘   └────────┬─────────┘   └────────┬─────────┘
       │                    │                       │
       │           ┌────────┼───────────────────────┤
       ▼           ▼        ▼                       ▼
┌──────────────────────────────────────────────────────────────┐
│                   Internal Services Bus                      │
└──────────────────────────────────────────────────────────────┘
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Card Service│   │ Payments Service  │   │Notification Svc  │
│(issue/freeze)│   │(transfers/FX/AML) │   │(push/email/SMS)  │
└──────────────┘   └──────────────────┘   └──────────────────┘
        ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────────┐
│                    External Adapters Layer                   │
│  KYC Adapter  │  Banking Adapter  │  Card Adapter  │  AML   │
│  (Onfido/mock)│  (Treezor/mock)   │ (Marqeta/mock) │  Svc   │
└──────────────────────────────────────────────────────────────┘
        ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│   PostgreSQL (main DB)  │  Redis (sessions/cache)            │
└──────────────────────────────────────────────────────────────┘
```

---

## Proposed Technology Stack

### Frontend — Web
- **Framework:** React + TypeScript
- **Build tool:** Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** TanStack Query (server state) + Zustand (client state)
- **Routing:** React Router v6

### Frontend — Mobile
- **Framework:** React Native (Expo)
- **Navigation:** Expo Router (file-based)
- **Storage:** AsyncStorage

### API Gateway
- **Implementation:** Express with path-based routing
- **Auth middleware:** JWT validation
- **Rate limiting:** express-rate-limit

### Backend Services
- **Runtime:** Node.js (TypeScript)
- **Framework:** Express 5
- **Database:** PostgreSQL + Drizzle ORM
- **Validation:** Zod v4
- **API spec:** OpenAPI 3.0

### Infrastructure
- **Containerization:** Docker (recommended for prod)
- **Session storage:** Redis (recommended for prod)
- **Message queue:** BullMQ (for async job processing)

---

## Data Flow: Onboarding

```
User → Web/Mobile
  → POST /api/onboarding/start (returns flow config for user's country)
  → POST /api/onboarding/step (submit step data, returns next step or completion)
  → POST /api/onboarding/kyc/initiate (start KYC check)
  → KYC Provider Webhook → /api/webhooks/kyc (update verification status)
  → Account provisioned (IBAN issued, card ordered)
```

## Data Flow: Payment

```
User → POST /api/payments/transfer/initiate
  → AML screening (sync or async)
  → FX quote if cross-currency
  → User confirms with 2FA OTP
  → POST /api/payments/transfer/confirm (with OTP)
  → Banking adapter executes transfer
  → Push notification sent
  → Transaction recorded in DB
```

---

## Security Model

- JWT tokens (short-lived 15min access tokens, 30d refresh tokens)
- All sensitive routes require valid JWT
- 2FA required for high-value actions (transfers, card management)
- OTP via SMS or email
- Biometric auth on mobile (device-level, not stored on server)
- All data encrypted in transit (TLS 1.3)
- PII fields encrypted at rest in DB

---

## Scalability Notes

- All services stateless (state in PostgreSQL + Redis)
- Horizontal scaling possible at all service layers
- Read replicas for account/transaction queries
- CDN for static assets
