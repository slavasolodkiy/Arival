# Integrations — Public Evidence

> Only sources publicly accessible: website, app store listings, job postings (if public), press releases.
> No proprietary infrastructure accessed.

---

## 1. Identity Verification / KYC

### Evidence
- App Store description references "identity verification" as part of onboarding
- Google Play listing implies document scanning capability
- Standard regulatory requirement for banking license

### Inferred Integration Options
| Provider | Confidence | Why |
|----------|------------|-----|
| Onfido | Medium | Most common KYC provider for European neobanks; SDK supports iOS/Android |
| Sumsub | Medium | Growing European IDV provider; supports same markets |
| Jumio | Low | Larger enterprise; possible for established neobanks |

**Design decision for Nexvault:** Use mock KYC adapter implementing `IDVAdapter` interface, switchable to real provider.

---

## 2. Core Banking / BaaS

### Evidence
- Multi-currency accounts (EUR, USD, GBP) are listed features
- SEPA and SWIFT transfers mentioned
- IBAN issuance implied

### Inferred Integration Options
| Provider | Confidence | Why |
|----------|------------|-----|
| Treezor | Medium | Popular French BaaS used by European neobanks |
| Railsbank (now Synctera) | Low | UK-based BaaS provider |
| Solaris Bank | Low | German BaaS; popular with European fintechs |
| Swan | Low | Newer European BaaS |

**Design decision for Nexvault:** Abstract banking operations behind `BankingAdapter` interface with mock implementation.

---

## 3. Card Issuance

### Evidence
- Debit card offering confirmed from app store descriptions
- Both virtual and physical cards implied by card management feature

### Inferred Providers
| Provider | Confidence | Why |
|----------|------------|-----|
| Marqeta | Medium | Market leader for neobank card programs |
| Mastercard Prepaid | Low | Direct network relationship possible at scale |
| Galileo | Low | US-focused; less likely for EU-first neobank |

**Design decision for Nexvault:** Mock `CardAdapter` interface.

---

## 4. Payments & Transfers

### Evidence
- International transfers mentioned on website
- Multi-currency account implies FX conversion

### Infrastructure
| Component | Confidence | Why |
|-----------|------------|-----|
| SEPA credit transfers | High | Required for EUR transfers in EU |
| SWIFT | High | Required for international wire transfers |
| FX conversion engine | High | Required for multi-currency accounts |

**Design decision for Nexvault:** Mock `PaymentsAdapter` with realistic transfer flow.

---

## 5. Push Notifications

### Evidence
- App Store permission list includes notifications
- Banking apps standardly use push for transaction alerts

### Providers
| Provider | Confidence | Why |
|----------|------------|-----|
| Firebase Cloud Messaging (FCM) | High | Industry standard for cross-platform mobile notifications |
| Apple Push Notification Service (APNs) | High | Required for iOS |

---

## 6. Analytics

### Evidence
- No public evidence found

### Industry Standard Options
| Provider | Confidence | Why |
|----------|------------|-----|
| Segment | Low | Common for B2C fintech |
| Amplitude | Low | Common for product analytics |
| Mixpanel | Low | Common for event-based analytics |

---

## 7. AML / Compliance Screening

### Evidence
- Regulatory requirement for banking license
- No public evidence of specific provider

### Options
| Provider | Confidence | Why |
|----------|------------|-----|
| ComplyAdvantage | Low | Popular for neobank AML screening |
| Sardine | Low | Fraud + AML platform for fintechs |
| LexisNexis | Low | Enterprise AML provider |

---

## 8. Email / Transactional Notifications

### Evidence
- Account verification emails expected (standard)
- Transaction receipts expected (standard)

### Options
| Provider | Confidence | Why |
|----------|------------|-----|
| SendGrid | Medium | Most common for fintech |
| AWS SES | Medium | Cost-effective at scale |
| Postmark | Low | Popular for transactional email |

---

## Summary for Nexvault Design

All external integrations will be abstracted behind clean adapter interfaces:

```
IDVAdapter        → mock implementation (pluggable: Onfido, Sumsub)
BankingAdapter    → mock implementation (pluggable: Treezor, Railsbank)
CardAdapter       → mock implementation (pluggable: Marqeta)
PaymentsAdapter   → mock implementation (pluggable: SWIFT, SEPA)
NotificationAdapter → mock implementation (pluggable: FCM, SendGrid)
AMLAdapter        → mock implementation (pluggable: ComplyAdvantage)
```

This design ensures:
1. No dependency on real third-party credentials for development
2. Clean swap to real providers when needed
3. Testable via adapter interfaces
