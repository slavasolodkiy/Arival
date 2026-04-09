# Nexvault — Evidence Matrix

> Last updated: 2026-04-09  
> Rev: DEMO_MODE/cookie/TS fixes applied; CI workflow intentionally removed from this branch for Replit-compatible push  
> All "Done" entries are backed by file references and previously verified commands.  
> "Partial" means the feature exists but has known gaps. "Not started" means no implementation exists.

---

## Verification commands

```bash
# Full workspace typecheck
pnpm run typecheck

# API-server test suite
pnpm --filter @workspace/api-server test

# Check DEMO_MODE flag usage
grep -rn "DEMO_MODE" artifacts/api-server/src/routes/
```

> Re-run these before the next formal evidence freeze if exact test counts / output wording must be re-verified.

---

## 1. Authentication & Identity

| Capability | Status | Implementation | Notes |
|---|---|---|---|
| Email/password registration | ✅ Done | `artifacts/api-server/src/routes/auth.ts` → `POST /api/auth/register` | Bcrypt hashing implemented |
| Password hashing | ✅ Done | `auth.ts` uses bcrypt | Intended strength previously verified |
| JWT access token | ✅ Done | `auth.ts` issues access token | Verify exact expiry in code before next formal freeze |
| JWT refresh token | ✅ Done | `auth.ts` issues refresh token | Verify exact expiry in code before next formal freeze |
| Refresh token stored in httpOnly cookie | ✅ Done | `auth.ts` → `res.cookie("refresh_token", …, { httpOnly: true })` | |
| Cookie `secure` flag | ✅ Done | `auth.ts` → `secure: process.env.NODE_ENV === "production"` | false in dev, true in prod |
| Cookie `sameSite` | ✅ Done | `auth.ts` → `sameSite: "lax"` | "lax" — not "strict" |
| Auto-verify email in demo mode | ✅ Done | `auth.ts` → `if (DEMO_MODE) { emailVerified = true }` | Requires `DEMO_MODE=true` |
| Login with `kycStatus` routing (web) | ✅ Done | `artifacts/nexvault-web/src/pages/login.tsx` | Redirects to `/onboarding` or `/dashboard` |
| Session invalidation / logout | ✅ Done | `auth.ts` → `POST /api/auth/logout` clears refresh cookie | |
| OTP request for high-value payments | ✅ Done | `artifacts/api-server/src/routes/payments.ts` | OTP required above configured threshold |
| OTP demo code fixed | ✅ Done | `auth.ts` → `DEMO_MODE ? "123456" : generateOtp()` | Demo-only behavior |
| OTP verify endpoint | ✅ Done | `auth.ts` → `POST /api/auth/otp/verify` | Validates code, marks `used=true` |
| DEMO_MODE — strict flag only | ✅ Done | Route files use `process.env.DEMO_MODE === "true"` only | No `NODE_ENV` fallback |

---

## 2. KYC Onboarding Engine

| Capability | Status | Implementation | Notes |
|---|---|---|---|
| Config-driven flow (individual) | ✅ Done | `config/onboarding/individual-flow.json` | 13 steps |
| Config-driven flow (business) | ✅ Done | `config/onboarding/business-flow.json` | Triggered by branching |
| Branching logic (FATCA) | ✅ Done | `onboarding.ts` branch resolver; US residents routed to `tax_info_fatca` | |
| Field types rendered (web) | ✅ Done | `artifacts/nexvault-web/src/pages/onboarding.tsx` FieldRenderer | text, date, select, radio, checkbox, country_select, document_upload, selfie |
| Progress bar | ✅ Done | `onboarding.tsx` — `currentStepIndex / totalSteps` | |
| Server-side state machine | ✅ Done | `onboarding.ts` — strict transitions: `not_started → in_progress → kyc_pending → approved` | |
| Step-order enforcement | ✅ Done | `onboarding.ts` rejects any `stepId ≠ currentStep` with 400 | Integration test coverage previously reported |
| Auto-approve in demo mode | ✅ Done | `onboarding.ts` → `if (DEMO_MODE) { status = "approved" }` | Requires `DEMO_MODE=true` |
| Account provisioning on approval | ✅ Done | `onboarding.ts` creates USD/EUR/GBP accounts after approval | |
| Business flow redirect | ✅ Done | `REDIRECT_BUSINESS_FLOW` updates `flowType`, restarts at first business step | |
| `TERMINAL_SIGNALS` — `REDIRECT_BUSINESS_FLOW` absent | ✅ Done | `onboarding.ts` exports terminal signal set without business redirect marker | |
| Mobile onboarding screen | ✅ Done | `artifacts/nexvault-mobile/app/(onboarding)/index.tsx` | Renderer + progress + success state |
| Mobile KYC gating | ✅ Done | `artifacts/nexvault-mobile/context/AuthContext.tsx` | Routes to `/(onboarding)` when `kycStatus !== "approved"` |

---

## 3. Accounts & Balances

| Capability | Status | Implementation | Notes |
|---|---|---|---|
| Multi-currency accounts | ✅ Done | `artifacts/api-server/src/routes/accounts.ts` → `GET /api/accounts` | USD, EUR, GBP |
| Account summary | ✅ Done | `GET /api/accounts/summary` | Total in USD equivalent |
| Individual account detail | ✅ Done | `GET /api/accounts/:id` | |
| Account creation on KYC approval | ✅ Done | Triggered in `onboarding.ts` final step | Demo balances seeded |

---

## 4. Cards Management

| Capability | Status | Implementation | Notes |
|---|---|---|---|
| List user cards | ✅ Done | `GET /api/cards` | |
| Card freeze/unfreeze | ✅ Done | `PATCH /api/cards/:id/freeze` + `/unfreeze` | |
| Card details (masked PAN) | ✅ Done | `GET /api/cards/:id` — last 4 digits only | |

---

## 5. Payments & Transfers

| Capability | Status | Implementation | Notes |
|---|---|---|---|
| Initiate transfer | ✅ Done | `POST /api/payments/transfer/initiate` | Returns OTP requirement for high-value transfers |
| OTP confirmation for protected transfers | ✅ Done | `POST /api/payments/transfer/confirm` | Validates OTP before executing |
| Payment history | ✅ Done | `GET /api/payments` | |
| SQL injection prevention | ✅ Done | ORM-based query construction used; raw interpolation previously removed | Security fix |
| Transfer fee calculation | ✅ Done | Fee returned in initiate response | |

---

## 6. Security & Compliance

| Capability | Status | Implementation | Notes |
|---|---|---|---|
| CORS allowlist | ✅ Done | `ALLOWED_ORIGINS` env var; dev allows all | `artifacts/api-server/src/app.ts` |
| Parameterised SQL via ORM | ✅ Done | Drizzle ORM throughout; `inArray()` used for `IN` clauses | No raw interpolation expected |
| JWT secret via env | ✅ Done | `SESSION_SECRET` env var | Dev fallback, if present, must be rotated before real deployment |
| Refresh token httpOnly cookie | ✅ Done | `auth.ts` sets `httpOnly: true` | |
| Cookie `sameSite: "lax"` | ✅ Done | `auth.ts` sets `sameSite: "lax"` | |
| OTP expiry | ⚠️ Verify before next evidence freeze | Check actual `expiresAt` calculation in auth/payments flow | Prior conflict showed inconsistent 5 vs 10 min wording |
| Rate limiting | ❌ Not started | No rate limiting on auth or OTP routes yet | Near-term priority |
| 2FA / TOTP | ❌ Not started | Backlog | |
| AML screening | ❌ Not started | Backlog | |

---

## 7. Developer Infrastructure

| Capability | Status | Command / File evidence |
|---|---|---|
| TypeScript strict mode — all packages | ✅ Done | `pnpm run typecheck` |
| OpenAPI spec | ✅ Done | `lib/api-spec/openapi.yaml` — manually maintained |
| `/auth/otp/verify` in spec | ✅ Done | Added endpoint + request/response types |
| `payment_confirm` OTP purpose enum | ✅ Done | Added to spec + schema layer |
| Generated React Query hooks | ✅ Done | `lib/api-client-react/src/generated/api.ts` — manually patched |
| Generated Zod schemas | ✅ Done | `lib/api-zod/src/generated/api.ts` — manually patched |
| Drizzle ORM | ✅ Done | `lib/db/src/schema.ts` |
| Config-driven onboarding | ✅ Done | `config/onboarding/` JSON flow configs |
| DEMO_MODE flag | ✅ Done | `process.env.DEMO_MODE === "true"` only — no `NODE_ENV` fallback |
| CI workflow | ❌ Not started | `.github/workflows/ci.yml` intentionally removed from this branch for Replit-compatible push |
| Unit tests (Vitest) | ✅ Done | `artifacts/api-server/src/__tests__/` |
| Route-level integration tests | ✅ Done | `artifacts/api-server/src/__tests__/routes.integration.test.ts` |
| `TERMINAL_SIGNALS` exported | ✅ Done | `onboarding.ts` exports terminal signal set for direct verification |
| Orval codegen | ❌ Broken | `Failed to resolve input` — generated file changes must be patched manually |

---

## 8. Frontend Pages (Web)

| Page | Status | Path |
|---|---|---|
| Landing / Home | ✅ Done | `/` |
| Register | ✅ Done | `/register` |
| Login | ✅ Done | `/login` — routes to `/onboarding` or `/dashboard` based on `kycStatus` |
| Onboarding | ✅ Done | `/onboarding` — config-driven flow |
| Dashboard | ✅ Done | `/dashboard` |
| Accounts | ✅ Done | `/accounts` |
| Cards | ✅ Done | `/cards` |
| Payments | ✅ Done | `/payments` |
| Settings | ✅ Done | `/settings` |

---

## 9. Mobile App (Expo)

| Screen | Status | File |
|---|---|---|
| Auth gating | ✅ Done | `artifacts/nexvault-mobile/context/AuthContext.tsx` |
| Login | ✅ Done | `artifacts/nexvault-mobile/app/(auth)/login.tsx` |
| Register | ✅ Done | `artifacts/nexvault-mobile/app/(auth)/register.tsx` |
| Onboarding flow | ✅ Done | `artifacts/nexvault-mobile/app/(onboarding)/index.tsx` |
| Dashboard tab | ✅ Done | `artifacts/nexvault-mobile/app/(tabs)/index.tsx` |
| Accounts tab | ✅ Done | `artifacts/nexvault-mobile/app/(tabs)/accounts.tsx` |
| Cards tab | ✅ Done | `artifacts/nexvault-mobile/app/(tabs)/cards.tsx` |
| Payments tab | ✅ Done | `artifacts/nexvault-mobile/app/(tabs)/payments.tsx` |
| Settings tab | ✅ Done | `artifacts/nexvault-mobile/app/(tabs)/settings.tsx` |

---

## 10. pnpm workspace overrides

| Override scope | Status | Notes |
|---|---|---|
| `esbuild` cross-platform binaries | ✅ Correct | All non-`linux-x64` binaries removed; `esbuild-linux-x64` kept for current platform |
| `rollup` cross-platform binaries | ✅ Correct | Current Linux x64 glibc target kept; non-current variants removed |
| `lightningcss` cross-platform binaries | ✅ Correct | Current Linux x64 glibc target kept |
| `@tailwindcss/oxide` cross-platform | ✅ Correct | Current Linux x64 glibc target kept |
| Note | — | Overrides are Replit-specific (Linux x64 glibc). Developers on macOS/Windows would need to adjust or remove these overrides locally. |

---

## 11. Open Gaps / Backlog

| Item | Priority |
|---|---|
| Rate limiting (auth + OTP routes) | High |
| Orval codegen — fix `Failed to resolve input` | Medium |
| Webhook system (transaction notifications) | Medium |
| Real document verification (Onfido / Jumio) | Medium |
| Real AML screening (Comply Advantage) | Medium |
| 2FA / TOTP | Medium |
| Statement download (PDF) | Low |
| FX rate live data | Low |
| Multi-language i18n | Low |
| Accessibility (WCAG 2.1 AA) | Medium |
