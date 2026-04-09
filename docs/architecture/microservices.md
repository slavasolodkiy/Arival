# Microservices Design — Nexvault

## Service Inventory

| Service | Responsibility | DB Tables | External Deps |
|---------|---------------|-----------|---------------|
| auth-service | Login, JWT issuance, OTP, sessions | users, sessions, otp_codes | SMS provider |
| onboarding-service | KYC flow engine, document upload, status tracking | onboarding_applications, kyc_documents | IDV adapter |
| account-service | Account creation, IBAN, balances | accounts, account_numbers | Banking adapter |
| card-service | Card issuance, freeze/unfreeze, limits | cards, card_transactions | Card adapter |
| payments-service | Transfers, FX, payment scheduling | payments, fx_rates, beneficiaries | Banking + AML adapters |
| notification-service | Push, email, SMS dispatch | notification_log | FCM, SendGrid |
| crm-service | Support tickets, in-app chat events | support_tickets | (optional CRM) |

---

## Auth Service

### Endpoints
```
POST /api/auth/register          — start registration
POST /api/auth/verify-email      — verify email OTP
POST /api/auth/verify-phone      — verify phone OTP
POST /api/auth/login             — login with email+password
POST /api/auth/refresh           — refresh access token
POST /api/auth/logout            — revoke refresh token
POST /api/auth/otp/request       — request step-up OTP
POST /api/auth/otp/verify        — verify step-up OTP
```

### Data Model
```sql
users:
  id UUID PK
  email VARCHAR UNIQUE NOT NULL
  phone VARCHAR UNIQUE
  password_hash VARCHAR NOT NULL
  email_verified BOOLEAN DEFAULT false
  phone_verified BOOLEAN DEFAULT false
  kyc_status ENUM('pending','in_progress','approved','rejected')
  account_type ENUM('individual','business')
  created_at TIMESTAMP

sessions:
  id UUID PK
  user_id UUID FK users
  refresh_token VARCHAR UNIQUE
  expires_at TIMESTAMP
  device_fingerprint VARCHAR

otp_codes:
  id UUID PK
  user_id UUID FK users
  code VARCHAR(6)
  purpose ENUM('email_verify','phone_verify','step_up','password_reset')
  expires_at TIMESTAMP
  used BOOLEAN DEFAULT false
```

---

## Onboarding Service

### Endpoints
```
POST /api/onboarding/start                    — initiate flow, returns config
POST /api/onboarding/step                     — submit step answer
GET  /api/onboarding/status                   — get current status
POST /api/onboarding/documents/upload         — upload KYC document
POST /api/onboarding/kyc/initiate             — start IDV check
GET  /api/onboarding/kyc/status               — poll IDV result
POST /api/webhooks/kyc                        — IDV provider webhook
```

### Data Model
```sql
onboarding_applications:
  id UUID PK
  user_id UUID FK users
  flow_type ENUM('individual','business')
  country_code VARCHAR(2)
  current_step VARCHAR
  step_data JSONB
  status ENUM('in_progress','kyc_pending','approved','rejected','manual_review')
  created_at TIMESTAMP
  updated_at TIMESTAMP

kyc_documents:
  id UUID PK
  application_id UUID FK onboarding_applications
  document_type ENUM('passport','national_id','driving_licence','proof_of_address','company_reg')
  provider_reference VARCHAR
  status ENUM('uploaded','submitted','verified','rejected')
  created_at TIMESTAMP
```

---

## Account Service

### Endpoints
```
GET  /api/accounts                   — list user's accounts
POST /api/accounts                   — create new account (currency)
GET  /api/accounts/:id               — account detail with balance
GET  /api/accounts/:id/transactions  — transaction history
GET  /api/accounts/summary           — dashboard summary
```

### Data Model
```sql
accounts:
  id UUID PK
  user_id UUID FK users
  currency ENUM('USD','EUR','GBP','SGD','AED')
  iban VARCHAR UNIQUE
  account_number VARCHAR
  sort_code VARCHAR
  balance NUMERIC(18,2) DEFAULT 0
  available_balance NUMERIC(18,2) DEFAULT 0
  status ENUM('active','frozen','closed')
  created_at TIMESTAMP

transactions:
  id UUID PK
  account_id UUID FK accounts
  type ENUM('credit','debit')
  category ENUM('transfer','card','fee','fx','interest')
  amount NUMERIC(18,2)
  currency VARCHAR(3)
  description VARCHAR
  reference VARCHAR
  counterparty JSONB
  status ENUM('pending','completed','failed','reversed')
  created_at TIMESTAMP
```

---

## Card Service

### Endpoints
```
GET  /api/cards                   — list user's cards
POST /api/cards                   — issue new card (virtual/physical)
GET  /api/cards/:id               — card detail
PUT  /api/cards/:id/freeze        — freeze card
PUT  /api/cards/:id/unfreeze      — unfreeze card
PUT  /api/cards/:id/limits        — update spend limits
GET  /api/cards/:id/transactions  — card transactions
```

### Data Model
```sql
cards:
  id UUID PK
  user_id UUID FK users
  account_id UUID FK accounts
  card_type ENUM('virtual','physical')
  last_four VARCHAR(4)
  expiry_month INT
  expiry_year INT
  status ENUM('active','frozen','cancelled','expired')
  spend_limit_daily NUMERIC(18,2)
  spend_limit_monthly NUMERIC(18,2)
  provider_card_id VARCHAR
  created_at TIMESTAMP
```

---

## Payments Service

### Endpoints
```
GET  /api/payments/beneficiaries          — list saved beneficiaries
POST /api/payments/beneficiaries          — add beneficiary
GET  /api/payments/fx/quote               — get FX quote
POST /api/payments/transfer/initiate      — initiate transfer
POST /api/payments/transfer/confirm       — confirm with OTP
GET  /api/payments/transfers              — transfer history
GET  /api/payments/transfers/:id          — transfer status
```

### Data Model
```sql
beneficiaries:
  id UUID PK
  user_id UUID FK users
  name VARCHAR
  account_number VARCHAR
  sort_code VARCHAR
  iban VARCHAR
  swift_bic VARCHAR
  bank_name VARCHAR
  country VARCHAR(2)
  currency VARCHAR(3)
  created_at TIMESTAMP

payments:
  id UUID PK
  user_id UUID FK users
  from_account_id UUID FK accounts
  beneficiary_id UUID FK beneficiaries
  amount NUMERIC(18,2)
  source_currency VARCHAR(3)
  destination_currency VARCHAR(3)
  exchange_rate NUMERIC(12,6)
  destination_amount NUMERIC(18,2)
  fee NUMERIC(18,2)
  reference VARCHAR
  status ENUM('pending','processing','completed','failed','cancelled')
  provider_reference VARCHAR
  initiated_at TIMESTAMP
  completed_at TIMESTAMP
```

---

## Notification Service

### Internal Events Consumed
- `account.credited` → push + email
- `account.debited` → push
- `card.frozen` / `card.unfrozen` → push
- `payment.completed` / `payment.failed` → push + email
- `kyc.approved` / `kyc.rejected` → push + email

### Endpoints
```
GET  /api/notifications                  — list notifications
PUT  /api/notifications/:id/read         — mark read
PUT  /api/notifications/read-all         — mark all read
GET  /api/notifications/preferences      — get preferences
PUT  /api/notifications/preferences      — update preferences
```
