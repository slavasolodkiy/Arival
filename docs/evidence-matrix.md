# Nexvault — Evidence Matrix

> Last updated: 2026-04-09

This document maps every platform capability to its implementation artifacts, test evidence, and open gaps.

---

## 1. Authentication & Identity

| Capability | Status | Implementation | Evidence |
|---|---|---|---|
| Email/password registration | ✅ Done | `artifacts/api-server/src/routes/auth.ts` → `POST /api/auth/register` | E2E: registration toast confirmed |
| JWT access + refresh tokens | ✅ Done | `auth.ts` issues 15-min access token + 7-day httpOnly refresh cookie | `useAuth()` hook, `/api/auth/refresh` |
| Auto-verify email (demo mode) | ✅ Done | `DEMO_MODE=true` sets `emailVerified=true` immediately | E2E test passes without mail |
| Login with kycStatus routing | ✅ Done | `login.tsx` → redirects to `/onboarding` if status=pending/in_progress | E2E: confirmed redirect |
| Session invalidation / logout | ✅ Done | `POST /api/auth/logout` clears refresh cookie | Logout button in sidebar |
| Password hashing | ✅ Done | `bcrypt` with 12 rounds | `auth.ts` line ~35 |
| OTP for high-value payments | ✅ Done | Transfers ≥ $500 require OTP; stored in `otp_codes` table with expiry | `payments.ts` confirm route |
| OTP demo code | ✅ Done | In demo mode, OTP always "123456"; `devOtp` returned in response | `auth.ts` OTP generation |
| OTP verify endpoint | ✅ Done | `POST /api/auth/otp/verify` — validates code, marks used | `auth.ts` + OpenAPI spec synced |
| DEMO_MODE strict flag | ✅ Done | Only `process.env.DEMO_MODE === "true"` — no NODE_ENV fallback | `onboarding.ts`, `auth.ts` |

---

## 2. KYC Onboarding Engine

| Capability | Status | Implementation | Evidence |
|---|---|---|---|
| Config-driven flow (individual) | ✅ Done | `config/onboarding/individual-flow.json` | 13 steps rendered dynamically |
| Config-driven flow (business) | ✅ Done | `config/onboarding/business-flow.json` | Triggered when accountType=business selected |
| Branching logic (FATCA) | ✅ Done | `flowConfig.branches` → US residents get `tax_info_fatca` step | Onboarding page branch resolver |
| Field types rendered | ✅ Done | text, date, select, radio, checkbox, country_select, document_upload, selfie | `onboarding.tsx` FieldRenderer |
| Document upload (demo stub) | ✅ Done | File input rendered; auto-approved in demo mode | Step `document_upload` in flow |
| Selfie capture (demo stub) | ✅ Done | Camera icon + continue; auto-approved in demo | Step `selfie_check` in flow |
| Progress bar | ✅ Done | `currentStepIndex / totalSteps` percent | Onboarding header bar |
| Server-side state machine | ✅ Done | Strict `in_progress` → `kyc_pending` → `approved` transitions | `onboarding.ts` routes |
| Step-order enforcement | ✅ Done | Server rejects any stepId ≠ `currentStep` with 400 | Integration test: "step out of order" |
| Auto-approve (demo) | ✅ Done | `DEMO_MODE=true` skips manual review | Final step callback |
| Account provisioning | ✅ Done | 3 multi-currency accounts created on approval (USD/EUR/GBP) | `accounts.ts` seed logic |
| Business redirect | ✅ Done | `REDIRECT_BUSINESS_FLOW` not in `TERMINAL_SIGNALS` — updates flowType, restarts at first business step | `onboarding.ts` state machine |
| `REDIRECT_BUSINESS_FLOW` removed from terminals | ✅ Done | P0 fix: was causing premature approval; now correctly switches flow | Integration test covers this |
| Onboarding status field | ✅ Done | `StartOnboardingResponse.status` added to Zod + TS types | `api-zod`, `api-client-react` |
| Mobile onboarding screens | ✅ Done | `(onboarding)/index.tsx` — full field renderer, progress bar, success screen | Expo mobile app |
| Mobile KYC gating | ✅ Done | `AuthContext` routes to `/(onboarding)` until `kycStatus === "approved"` | `context/AuthContext.tsx` |

---

## 3. Accounts & Balances

| Capability | Status | Implementation | Evidence |
|---|---|---|---|
| Multi-currency accounts | ✅ Done | `GET /api/accounts` → USD, EUR, GBP | Dashboard shows all 3 |
| Account summary (total USD eq.) | ✅ Done | `GET /api/accounts/summary` | Dashboard header balance |
| Individual account detail | ✅ Done | `GET /api/accounts/:id` | Accounts page detail view |
| Account creation on onboarding | ✅ Done | Triggered on KYC approval; seeded with demo balances | `accounts.ts` |
| Typed Express params fix | ✅ Done | `String(req.params["id"])` handles `string|string[]` (Express v5) | Phase A fix |

---

## 4. Cards Management

| Capability | Status | Implementation | Evidence |
|---|---|---|---|
| List user cards | ✅ Done | `GET /api/cards` | Cards page |
| Virtual card | ✅ Done | Card record with `virtual=true` | Demo seed |
| Card freeze/unfreeze | ✅ Done | `PATCH /api/cards/:id/freeze` + `unfreeze` | Cards page toggle |
| Card details (PAN masked) | ✅ Done | `GET /api/cards/:id` — last 4 digits only | Cards page |

---

## 5. Payments & Transfers

| Capability | Status | Implementation | Evidence |
|---|---|---|---|
| Initiate transfer | ✅ Done | `POST /api/payments/transfer/initiate` | Payments page |
| OTP confirmation (≥ $500) | ✅ Done | `POST /api/payments/transfer/confirm` with OTP | Demo OTP "123456" |
| OTP confirm missing guard | ✅ Done | 400 returned if `otpCode` absent in confirm body | Integration test: schema validation |
| Payment history | ✅ Done | `GET /api/payments` | Payments page table |
| `PaymentRow` component | ✅ Done | Mobile `PaymentRow.tsx` renders `Payment` type correctly (no type mismatch) | Typecheck: 0 errors |
| SQL injection prevention | ✅ Done | Replaced `sql.raw` with `inArray()` in `users.ts` | Security fix — P0 |
| Transfer fee calculation | ✅ Done | Fee returned in initiate response | UI shows fee breakdown |

---

## 6. Security & Compliance

| Capability | Status | Implementation | Evidence |
|---|---|---|---|
| CORS allowlist | ✅ Done | `ALLOWED_ORIGINS` env var; dev allows all | `api-server/src/app.ts` |
| Parameterised SQL | ✅ Done | Drizzle ORM — no raw interpolation; `inArray()` replacing `sql.raw` | P0 security fix |
| JWT secret rotation | ✅ Done | `SESSION_SECRET` env var (Replit secret) | `auth.ts` |
| Refresh token httpOnly cookie | ✅ Done | SameSite=Strict, Secure in production | `auth.ts` |
| OTP expiry (5 min) | ✅ Done | `expiresAt` stored, validated server-side | `otp_codes` table |
| Rate limiting | ⚠️ Partial | Not yet implemented for OTP/auth routes | Backlog |
| 2FA (TOTP) | ❌ Not started | Backlog | Backlog |
| AML screening | ❌ Not started | Backlog — would integrate Comply Advantage | Backlog |

---

## 7. Developer Infrastructure

| Capability | Status | Implementation | Evidence |
|---|---|---|---|
| TypeScript strict mode | ✅ Done | All 9 packages build clean (`tsc --noEmit`) | Full workspace typecheck: 0 errors |
| OpenAPI spec | ✅ Done | `lib/api-spec/openapi.yaml` | Manually maintained (codegen broken) |
| `/auth/otp/verify` in spec | ✅ Done | Added endpoint + `VerifyOtp` request/response types | P1 OpenAPI sync |
| `payment_confirm` OTP purpose | ✅ Done | Added to purpose enum in spec + Zod schemas | P1 OpenAPI sync |
| Generated React Query hooks | ✅ Done | `lib/api-client-react/src/generated/api.ts` — `useVerifyOtp` added | Manually patched |
| Generated Zod schemas | ✅ Done | `lib/api-zod/src/generated/api.ts` — `VerifyOtp` types added | Manually patched |
| Drizzle ORM migrations | ✅ Done | `lib/db/src/schema.ts` | `drizzle-kit push` |
| Config-driven onboarding | ✅ Done | JSON flow configs, not hardcoded | `config/onboarding/` |
| DEMO_MODE flag | ✅ Done | Auto-approves KYC, returns dev OTP; only `==="true"` check | `api-server` env |
| GitHub Actions CI | ✅ Done | `.github/workflows/ci.yml` — typecheck + unit + integration tests | Phase E |
| Unit tests (Vitest) | ✅ Done | Auth hashing, OTP lifecycle, payment threshold | `artifacts/api-server/src/__tests__/` |
| Route-level integration tests | ✅ Done | 39 tests passing — auth guards, schema validation, step-order, OTP confirm | `src/__tests__/routes.integration.test.ts` |
| `TERMINAL_SIGNALS` exported | ✅ Done | `export const TERMINAL_SIGNALS` — directly testable | Integration test verifies `REDIRECT_BUSINESS_FLOW` absent |

---

## 8. Frontend Pages

| Page | Status | Path | Notes |
|---|---|---|---|
| Landing / Home | ✅ Done | `/` | Marketing hero |
| Register | ✅ Done | `/register` | Auto-redirects to `/login` |
| Login | ✅ Done | `/login` | Routes to `/onboarding` or `/dashboard` based on kycStatus |
| Onboarding | ✅ Done | `/onboarding` | Config-driven, 13 steps |
| Dashboard | ✅ Done | `/dashboard` | Multi-currency balances + recent transactions |
| Accounts | ✅ Done | `/accounts` | Lists all accounts |
| Cards | ✅ Done | `/cards` | Virtual + physical card management |
| Payments | ✅ Done | `/payments` | Transfer form + history |
| Settings | ✅ Done | `/settings` | Profile management |

---

## 9. Mobile App (Expo)

| Screen | Status | Path | Notes |
|---|---|---|---|
| Auth gating | ✅ Done | `AuthContext.tsx` | Redirects to `/(onboarding)` until kycStatus=approved |
| Login screen | ✅ Done | `app/(auth)/login.tsx` | JWT stored in AsyncStorage |
| Register screen | ✅ Done | `app/(auth)/register.tsx` | |
| Onboarding flow | ✅ Done | `app/(onboarding)/index.tsx` | Full field renderer (text/radio/select/checkbox), progress bar, success state |
| Dashboard tab | ✅ Done | `app/(tabs)/index.tsx` | Balance + recent transactions |
| Accounts tab | ✅ Done | `app/(tabs)/accounts.tsx` | Multi-currency accounts list |
| Cards tab | ✅ Done | `app/(tabs)/cards.tsx` | Freeze/unfreeze, masked PAN |
| Payments tab | ✅ Done | `app/(tabs)/payments.tsx` | Transfer + OTP confirmation |
| Settings tab | ✅ Done | `app/(tabs)/settings.tsx` | Profile + logout |

---

## 10. Open Gaps / Backlog

| Item | Priority | Phase |
|---|---|---|
| Rate limiting (auth + OTP routes) | High | F |
| Webhook system (transaction notifications) | Medium | F |
| Real document verification (Onfido / Jumio) | Medium | G |
| Real AML screening (Comply Advantage) | Medium | G |
| 2FA / TOTP | Medium | F |
| Statement download (PDF) | Low | F |
| FX rate engine | Low | F |
| Multi-language i18n | Low | H |
| Accessibility (WCAG 2.1 AA) audit | Medium | H |
| Orval codegen broken (manual patch required) | Medium | — |
