# Architecture Hypotheses — Nexvault

> Based on publicly observable behavior, app store metadata, and industry standard patterns for neobanks of similar scale.
> All hypotheses marked with confidence scores. Nothing here is derived from traffic interception or reverse engineering.

---

## 1. Frontend Architecture

### Web (arivalbank.com / arival.com)

| Hypothesis | Confidence | Evidence |
|------------|------------|---------|
| React or Next.js for web frontend | Medium | JavaScript-heavy site behavior; SSR patterns inferred from page load |
| Tailwind CSS or similar utility framework | Low | Visual consistency across breakpoints |
| SPA (Single Page Application) for dashboard | Medium | App-like navigation pattern in bank portal |
| CDN-served static assets | High | Standard for fintech landing pages |
| Marketing site separate from app portal | High | arival.com (marketing) vs arivalbank.com (app) pattern |

### Mobile App

| Hypothesis | Confidence | Evidence |
|------------|------------|---------|
| React Native OR native iOS/Android | Medium | App bundle size, performance characteristics from App Store |
| Shared codebase for iOS + Android | Medium | Simultaneous release pattern; similar UI across platforms |
| Expo or bare React Native | Low | No definitive evidence; React Native widely used by neobanks |
| Firebase for push notifications | Medium | Standard for React Native apps |

---

## 2. Backend Architecture

| Hypothesis | Confidence | Evidence |
|------------|------------|---------|
| Microservices architecture | Medium | Scale and regulatory requirements favor microservices; standard for neobanks |
| API Gateway (e.g., Kong, AWS API Gateway) | Medium | Required for microservices; standard pattern |
| Node.js or Go for backend services | Low | No direct evidence; common in neobanks |
| PostgreSQL as primary database | Medium | Standard relational DB for banking; strong ACID guarantees |
| Redis for session/cache | Medium | Standard for high-performance auth sessions |
| Message queue (Kafka/RabbitMQ) for events | Low | Hypothesis for transaction processing |
| Kubernetes / container orchestration | Medium | Standard for neobank scale |

---

## 3. Third-Party Integrations (Inferred)

| Service Category | Likely Provider(s) | Confidence | Evidence |
|-----------------|-------------------|------------|---------|
| KYC / IDV | Onfido, Jumio, or Sumsub | Medium | Industry standard KYC providers for neobanks |
| Core Banking | Treezor, Railsbank, or Synapse | Low | Hypothesis based on European neobank patterns |
| Card Issuance | Marqeta, Galileo, or Mastercard | Low | Standard card issuing providers |
| Payment Processing | SWIFT network, Sepa clearing | High | Required for international transfers |
| AML Screening | Comply Advantage, Sardine | Low | Hypothesis |
| Push Notifications | Firebase Cloud Messaging | Medium | Standard for mobile apps |
| Analytics | Segment, Amplitude, or Mixpanel | Low | Standard for consumer fintech |
| Email | SendGrid or AWS SES | Low | Common transactional email providers |

---

## 4. Auth & Security Architecture

| Hypothesis | Confidence | Evidence |
|------------|------------|---------|
| OAuth 2.0 / OpenID Connect for SSO | Medium | Standard for modern financial apps |
| JWT-based session tokens | Medium | Standard for mobile banking APIs |
| Biometric auth on mobile (Face ID / Touch ID) | High | App Store description implies biometric |
| OTP via SMS for step-up auth | High | Standard for banking security |
| Device fingerprinting / fraud detection | Medium | Standard for neobanks |

---

## 5. Onboarding Flow Architecture

| Hypothesis | Confidence | Evidence |
|------------|------------|---------|
| Configurable step-by-step onboarding engine | High | All neobanks use multi-step KYC flows |
| Country-based branching (different requirements per country) | High | International positioning requires country-specific compliance |
| Document type branching (passport vs national ID vs driving license) | High | Standard KYC requirement |
| Business vs individual flow split | High | Website markets both account types |
| Risk scoring during onboarding | Medium | Standard AML requirement |
| Manual review fallback for edge cases | High | Required by compliance frameworks |

---

## 6. Deployment & Infrastructure

| Hypothesis | Confidence | Evidence |
|------------|------------|---------|
| AWS or GCP cloud | Medium | Standard for European fintech; no direct evidence |
| Multi-region deployment | Low | Hypothesis based on international user base |
| CDN (Cloudflare or AWS CloudFront) | High | Standard for web performance |
| CI/CD pipeline (GitHub Actions or similar) | Medium | Standard software engineering practice |

---

## Open Questions

1. Which core banking-as-a-service provider powers the actual accounts?
2. Is the mobile app React Native or fully native?
3. What analytics tooling is in use?
4. How is FX pricing computed — own FX engine or third-party?
5. What is the actual banking license structure (EMI, full banking, BaaS layer)?
