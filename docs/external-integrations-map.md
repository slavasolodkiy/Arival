# External Integrations Map — Nexvault

> Confidence levels: **Observed** (verified in code), **Inferred** (implied by code structure or flow), **Planned** (documented as future work, not implemented).

---

## 1. Identity Verification & KYC

| Provider | Integration Point | Auth Method | Status | Confidence | Evidence |
|---|---|---|---|---|---|
| Internal (config-driven engine) | Step-by-step KYC flow via JSON configs | None — server-side logic | ✅ Implemented | Observed | `config/onboarding/individual-flow.json`, `artifacts/api-server/src/routes/onboarding.ts` |
| Onfido | Document + selfie biometric verification | API key (REST) | ❌ Not implemented | Planned | Evidence matrix `docs/evidence-matrix.md` — "Real document verification (Onfido / Jumio)" listed as backlog |
| Jumio | Document + liveness check alternative | API key (REST) | ❌ Not implemented | Planned | Same as above |
| iProov | Facial biometric liveness detection | API key (REST) | ❌ Not implemented | Planned | No integration code found |

### Public API notes — ID verification
- Onfido: `https://documentation.onfido.com/` — REST API, webhooks for result callbacks
- Jumio: `https://developer.jumio.com/` — REST + web SDK
- The current demo stub auto-approves all document/selfie steps when `DEMO_MODE=true` (`onboarding.ts` line 176)
- **Confirmed**: No third-party KYC provider is currently integrated
- **Unknown**: No decision has been made on which provider will be used in production

---

## 2. AML / Sanctions Screening

| Provider | Integration Point | Auth Method | Status | Confidence | Evidence |
|---|---|---|---|---|---|
| Comply Advantage | Name + country screening on account creation | API key | ❌ Not implemented | Planned | `docs/evidence-matrix.md` backlog; no code found |
| Chainalysis | Crypto transaction screening | API key | ❌ Not implemented | Planned | No code found |
| World-Check (Refinitiv) | PEP/sanctions list | API key | ❌ Not implemented | Planned | No code found |

### Public API notes — AML
- Comply Advantage: `https://docs.complyadvantage.com/` — REST, results include risk scores and match lists
- **Confirmed**: No AML screening is in place. Applications are auto-approved in demo mode.
- **Risk**: Production launch without AML screening violates most AML regulations.

---

## 3. Authentication & SSO

| Provider | Integration Point | Auth Method | Status | Confidence | Evidence |
|---|---|---|---|---|---|
| Internal JWT | Access + refresh token auth | JWT (SESSION_SECRET) | ✅ Implemented | Observed | `artifacts/api-server/src/routes/auth.ts` lines 12–23 |
| Google OAuth | SSO for user login | OAuth 2.0 / OIDC | ❌ Not implemented | Planned | No passport.js, no OAuth routes found |
| Microsoft Entra / Azure AD | Enterprise SSO | SAML / OIDC | ❌ Not implemented | Planned | No code found |
| Clerk | Hosted auth with pre-built UI | API key + JWT | ❌ Not implemented | Planned | Skill available (`clerk-auth`), not used |

### Public API notes — SSO / Auth
- **Confirmed**: Only JWT-based internal auth. No third-party SSO.
- **Confirmed**: OTP-based 2FA for high-value payments (≥ $500) via `POST /api/auth/otp/request` + `POST /api/auth/otp/verify`
- **Unknown**: Production email delivery for OTPs — no email provider (SendGrid, Mailgun, SES) is integrated

---

## 4. Payments Infrastructure

| Provider | Integration Point | Auth Method | Status | Confidence | Evidence |
|---|---|---|---|---|---|
| Internal ledger | Account balances + multi-currency transfers | N/A (DB) | ✅ Implemented | Observed | `artifacts/api-server/src/routes/payments.ts`, `lib/db/src/schema.ts` |
| Stripe | Card-not-present payments / payouts | API key (REST) | ❌ Not implemented | Planned | No Stripe SDK found |
| Modulr | UK banking rails (Faster Payments, BACS) | API key + mTLS | ❌ Not implemented | Planned | No Modulr SDK found |
| Currencycloud | FX multi-currency conversion | API key (REST) | ❌ Not implemented | Inferred | FX rates are hard-coded in `payments.ts` lines 18–24; real rates would require an FX API |
| SWIFT | International wire transfers | Correspondent banking | ❌ Not implemented | Planned | No SWIFT integration code |

### Public API notes — Payments
- **Confirmed**: All payment flows are simulated. Balances are seeded demo values.
- **Confirmed**: FX rates are hard-coded (`payments.ts:18`); no live rate feed.
- **Unknown**: Whether the production roadmap uses a single provider or aggregates multiple.

---

## 5. Notifications

| Provider | Integration Point | Auth Method | Status | Confidence | Evidence |
|---|---|---|---|---|---|
| Internal DB notifications | In-app notification store | N/A (DB) | ✅ Implemented | Observed | `artifacts/api-server/src/routes/notifications.ts`, `notificationsTable` schema |
| Push notifications (FCM/APNs) | Mobile push | API key | ❌ Not implemented | Planned | No Firebase/APNs SDK in mobile app |
| Email (SendGrid / SES) | Transaction emails, OTP delivery | API key | ❌ Not implemented | Planned | OTP only stored in DB; no email delivery code |
| SMS (Twilio / Vonage) | OTP SMS delivery | API key | ❌ Not implemented | Planned | No Twilio/Vonage SDK; OTP uses `devCode` in demo |

---

## 6. Data & Analytics

| Provider | Integration Point | Auth Method | Status | Confidence | Evidence |
|---|---|---|---|---|---|
| PostgreSQL (Replit managed) | Primary data store | DATABASE_URL (connection string) | ✅ Implemented | Observed | `lib/db/src/schema.ts`, `DATABASE_URL` env var |
| Drizzle ORM | Query builder + migrations | N/A | ✅ Implemented | Observed | `lib/db/` package |
| Mixpanel / Amplitude | Product analytics | API key | ❌ Not implemented | Planned | No analytics SDK found |
| Sentry | Error tracking | DSN | ❌ Not implemented | Planned | No Sentry SDK; pino logger only |

---

## 7. Public APIs — Onboarding-Specific (New Endpoints)

These endpoints were added in this iteration and are publicly accessible without authentication:

| Endpoint | Description | Auth | Status |
|---|---|---|---|
| `GET /api/onboarding/catalog` | Structured onboarding config for given flow/country/language | None | ✅ Implemented |
| `POST /api/onboarding/preview` | Branch-aware next-step computation | None | ✅ Implemented |

Response includes:
- Next question to present
- Allowed answer values (filtered by country availability)
- Branch reason (human-readable explanation of routing)
- Missing requirements for current step
- Completed steps so far

---

## 8. Summary — Confirmed vs Unknown

### Confirmed implemented
- Internal JWT auth with refresh tokens
- Internal KYC flow engine (config-driven, no third-party)
- Internal OTP (demo mode only — no email/SMS delivery)
- PostgreSQL via Drizzle ORM
- Internal ledger (no real banking rails)

### Confirmed not implemented
- Third-party KYC (Onfido, Jumio, iProov)
- AML/sanctions screening (Comply Advantage et al.)
- Real FX rates (hard-coded in code)
- Real payment rails (Modulr, SWIFT, Stripe)
- Email/SMS delivery for OTPs
- SSO (Google, Microsoft, Clerk)
- Mobile push notifications
- Error monitoring (Sentry)
- Product analytics

### Unknown / undecided
- Which KYC provider will be used in production
- Email delivery provider for OTPs in production
- Payment rail provider (Modulr, Currencycloud, or direct bank API)
- Whether FATCA reporting pipeline will be built or outsourced
