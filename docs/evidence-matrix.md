# Nexvault — Evidence Matrix

> Last updated: 2026-04-09
> All "Done" entries are backed by exact file references and verified commands.
> "Partial" means the feature exists but has known gaps. "Not started" means no implementation exists.

---

## Verification commands

```bash
# Full workspace typecheck (must exit 0)
pnpm run typecheck

# API-server test suite (must pass all 39 tests)
pnpm --filter @workspace/api-server test

# Check DEMO_MODE flag usage (must show no NODE_ENV fallback)
grep -rn "DEMO_MODE" artifacts/api-server/src/routes/
```

---

## 1. Authentication & Identity

| Capability | Status | Implementation | Notes |
|---|---|---|---|
| Email/password registration | ✅ Done | `artifacts/api-server/src/routes/auth.ts` → `POST /api/auth/register` | Bcrypt 12 rounds |
| JWT access token (15 min) | ✅ Done | `auth.ts` line 17–19: `jwt.sign({userId, type:"access"}, JWT_SECRET, {expiresIn:"15m"})` | |
| JWT refresh token (30 days) | ✅ Done | `auth.ts` line 21–23: `jwt.sign({userId, type:"refresh"}, JWT_SECRET, {expiresIn:"30d"})` | |
| Refresh token stored in httpOnly cookie | ✅ Done | `auth.ts` line 98–103: `res.cookie("refresh_token", …, {httpOnly:true})` | |
| Cookie `secure` flag | ✅ Done | `auth.ts` line 100: `secure: process.env.NODE_ENV === "production"` | false in dev, true in prod |
| Cookie `sameSite` | ✅ Done | `auth.ts` line 101: `sameSite: "lax"` | "lax" — **not "strict"** |
| Auto-verify email in demo mode | ✅ Done | `auth.ts` line 57: `if (DEMO_MODE) { emailVerified = true }` | Requires `DEMO_MODE=true` |
| Login with kycStatus routing (web) | ✅ Done | `artifacts/nexvault-web/src/pages/login.tsx` | Redirects to `/onboarding` or `/dashboard` |
| Session invalidation / logout | ✅ Done | `auth.ts` → `POST /api/auth/logout` clears refresh cookie | |
| OTP request for high-value payments | ✅ Done | `payments.ts` line 181: OTP generated when `amount >= 500` | |
| OTP demo code fixed | ✅ Done | `auth.ts` line 184: `DEMO_MODE ? "123456" : generateOtp()` | |
| OTP verify endpoint | ✅ Done | `auth.ts` → `POST /api/auth/otp/verify` | Validates code, marks `used=true` |
| DEMO_MODE — strict flag only | ✅ Done | All three route files: `process.env.DEMO_MODE === "true"` only — **no NODE_ENV fallback** | `auth.ts:15`, `payments.ts:15`, `onboarding.ts:12` |

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
| Step-order enforcement | ✅ Done | `onboarding.ts` rejects any `stepId ≠ currentStep` with 400 | Integration test: "step out of order" suite |
| Auto-approve in demo mode | ✅ Done | `onboarding.ts` line 176: `if (DEMO_MODE) { status = "approved" }` | Requires `DEMO_MODE=true` |
| Account provisioning on approval | ✅ Done | `onboarding.ts` creates USD/EUR/GBP accounts after approval | |
| Business flow redirect | ✅ Done | `REDIRECT_BUSINESS_FLOW` updates `flowType`, restarts at first business step | NOT in `TERMINAL_SIGNALS` — integration test confirms |
| `TERMINAL_SIGNALS` — `REDIRECT_BUSINESS_FLOW` absent | ✅ Done | `onboarding.ts` line 24: `export const TERMINAL_SIGNALS = new Set(["SUBMIT_KYC","SUBMIT"])` | Integration test: "business redirect" suite |
| Mobile onboarding screen | ✅ Done | `artifacts/nexvault-mobile/app/(onboarding)/index.tsx` | text/radio/select/checkbox renderer, progress bar, success state |
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
| Initiate transfer | ✅ Done | `POST /api/payments/transfer/initiate` | Returns `requiresOtp: true` if amount ≥ $500 |
| OTP confirmation (≥ $500) | ✅ Done | `POST /api/payments/transfer/confirm` — validates OTP before executing | |
| Payment history | ✅ Done | `GET /api/payments` | |
| SQL injection prevention | ✅ Done | `users.ts` uses `inArray()` — no `sql.raw` interpolation | Security fix |
| Transfer fee calculation | ✅ Done | Fee returned in initiate response | |

---

## 6. Security & Compliance

| Capability | Status | Notes |
|---|---|---|
| CORS allowlist | ✅ Done | `ALLOWED_ORIGINS` env var; dev allows all: `artifacts/api-server/src/app.ts:43` |
| Parameterised SQL via ORM | ✅ Done | Drizzle ORM throughout; `inArray()` for any `IN` clauses |
| JWT secret via env | ✅ Done | `SESSION_SECRET` env var; falls back to dev-only string in development |
| Refresh token httpOnly cookie | ✅ Done | `auth.ts:99` — `httpOnly: true` |
| Cookie `sameSite: "lax"` | ✅ Done | `auth.ts:101` — "lax" (not strict — allows top-level navigation) |
| OTP expiry (5 min) | ✅ Done | `expiresAt` stored in `otp_codes` table, validated server-side |
| Rate limiting | ❌ Not started | No rate limiting on auth or OTP routes |
| 2FA / TOTP | ❌ Not started | Backlog |
| AML screening | ❌ Not started | Backlog |

---

## 7. Developer Infrastructure

| Capability | Status | Command / File evidence |
|---|---|---|
| TypeScript strict mode — all packages | ✅ Done | `pnpm run typecheck` → EXIT 0 (5 packages: api-server, nexvault-web, nexvault-mobile, mockup-sandbox, scripts + libs) |
| OpenAPI spec | ✅ Done | `lib/api-spec/openapi.yaml` — manually maintained (Orval codegen not functional) |
| `/auth/otp/verify` in spec | ✅ Done | Added endpoint + `VerifyOtp` request/response types |
| `payment_confirm` OTP purpose enum | ✅ Done | Added to spec + Zod schemas |
| Generated React Query hooks | ✅ Done | `lib/api-client-react/src/generated/api.ts` — manually patched (includes `useVerifyOtp`) |
| Generated Zod schemas | ✅ Done | `lib/api-zod/src/generated/api.ts` — manually patched |
| Drizzle ORM | ✅ Done | `lib/db/src/schema.ts` |
| DEMO_MODE flag | ✅ Done | `process.env.DEMO_MODE === "true"` only — **no NODE_ENV fallback** in any route file |
| CI workflow | ✅ Done | `.github/workflows/ci.yml` — push + PR trigger; steps: install, typecheck, test |
| Unit tests (Vitest) | ✅ Done | `artifacts/api-server/src/__tests__/` — auth hashing, OTP lifecycle, payment threshold |
| Route-level integration tests | ✅ Done | `artifacts/api-server/src/__tests__/routes.integration.test.ts` — 39 tests: auth guards, schema validation, step-order, OTP confirm, business redirect |
| `pnpm run typecheck` + `pnpm --filter @workspace/api-server test` | ✅ Done | Both verified green as of 2026-04-09 |
| Orval codegen | ❌ Broken | `Failed to resolve input` — all generated file changes must be done manually |

---

## 8. Frontend Pages (Web)

| Page | Status | Path |
|---|---|---|
| Landing / Home | ✅ Done | `/` |
| Register | ✅ Done | `/register` |
| Login | ✅ Done | `/login` — routes to `/onboarding` or `/dashboard` based on kycStatus |
| Onboarding | ✅ Done | `/onboarding` — config-driven, 13 steps |
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
| `esbuild` cross-platform binaries | ✅ Correct | All non-`linux-x64` binaries removed; `esbuild-linux-x64` kept (current platform) |
| `rollup` cross-platform binaries | ✅ Correct | `rollup-linux-x64-gnu` NOT in override list — kept for current platform; musl variant removed |
| `lightningcss` cross-platform binaries | ✅ Correct | `linux-x64-gnu` kept; other platforms removed |
| `@tailwindcss/oxide` cross-platform | ✅ Correct | `linux-x64-gnu` kept |
| Note | — | Overrides are Replit-specific (linux x64 glibc). Developers on macOS/Windows would need to remove these overrides locally. |

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
