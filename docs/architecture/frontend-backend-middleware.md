# Frontend–Backend–Middleware Design — Nexvault

## 1. Request Lifecycle

```
Browser/Mobile
    │
    ├── HTTPS request
    ▼
API Gateway (Express middleware stack)
    ├── TLS termination
    ├── Rate limiting (100 req/15min per IP for public, 1000/15min for authenticated)
    ├── JWT validation (for protected routes)
    ├── Request logging (pino)
    ├── CORS validation
    ├── Zod body parsing & validation
    │
    ▼
Route Handlers
    ├── Business logic (services)
    ├── DB access (Drizzle ORM)
    └── External adapter calls (mocked in dev)
    │
    ▼
Response
    ├── Zod response validation
    ├── Structured JSON
    └── HTTP status codes
```

---

## 2. Middleware Stack

### Global Middleware (applied to all routes)

```typescript
// 1. Logging
app.use(pinoHttp({ logger }));

// 2. Security headers
app.use(helmet());

// 3. CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// 4. Rate limiting
app.use('/api/', rateLimiter.global);

// 5. Body parsing
app.use(express.json({ limit: '10mb' }));

// 6. Request ID
app.use(requestId());
```

### Auth Middleware (protected routes)

```typescript
// JWT validation
app.use('/api/accounts', authMiddleware);
app.use('/api/cards', authMiddleware);
app.use('/api/payments', authMiddleware);
app.use('/api/notifications', authMiddleware);
app.use('/api/onboarding', authMiddleware);

// Step-up auth (for sensitive operations)
router.post('/transfer/confirm', authMiddleware, stepUpAuthMiddleware, handler);
```

### Zod Validation Middleware

```typescript
// All incoming requests validated against OpenAPI-generated Zod schemas
const validateRequest = (schema: ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
  }
  req.validatedBody = result.data;
  next();
};
```

---

## 3. Authentication Flow

### Registration & Email Verification

```
POST /api/auth/register
  → Create user record (unverified)
  → Send email OTP
  → Return: { userId, nextStep: 'verify_email' }

POST /api/auth/verify-email
  → Verify OTP
  → Mark email_verified = true
  → Return: { nextStep: 'verify_phone' }
```

### Login Flow

```
POST /api/auth/login (email + password)
  → Validate credentials
  → Issue access token (15min JWT)
  → Issue refresh token (30d, stored in DB)
  → Set refresh token in httpOnly cookie
  → Return: { accessToken, user }

POST /api/auth/refresh
  → Validate refresh token from cookie
  → Issue new access token
  → Return: { accessToken }
```

### Step-Up Auth (for transfers, card ops)

```
POST /api/auth/otp/request
  → Send OTP via SMS/email
  → Return: { otpToken }  (short-lived, 5min)

POST /api/auth/otp/verify
  → Verify OTP + otpToken
  → Issue step-up token (10min)
  → Return: { stepUpToken }

POST /api/payments/transfer/confirm
  Headers: Authorization: Bearer <accessToken>
           X-Step-Up-Token: <stepUpToken>
  → Validate both tokens
  → Execute transfer
```

---

## 4. Sequence Diagrams

### Onboarding Flow

```
User           Web/Mobile        API            KYC Provider
 │                 │              │                 │
 │ Start onboard   │              │                 │
 ├────────────────►│              │                 │
 │                 │POST /onboarding/start          │
 │                 ├─────────────►│                 │
 │                 │ {steps, config}                │
 │                 │◄─────────────┤                 │
 │ Fill steps      │              │                 │
 ├────────────────►│POST /onboarding/step           │
 │                 ├─────────────►│                 │
 │                 │{nextStep}    │                 │
 │                 │◄─────────────┤                 │
 │ Upload docs     │              │                 │
 ├────────────────►│POST /documents/upload          │
 │                 ├─────────────►│                 │
 │                 │{docId}       │                 │
 │                 │◄─────────────┤                 │
 │ Start KYC       │              │                 │
 ├────────────────►│POST /kyc/initiate              │
 │                 ├─────────────►│                 │
 │                 │             ├─────────────────►│
 │                 │             │ Submit docs      │
 │                 │             │  verification    │
 │                 │  Pending    │◄─────────────────┤
 │                 │◄─────────────┤                 │
 │ (Waiting...)    │              │                 │
 │                 │              │◄─────────────────┤
 │                 │              │ Webhook result   │
 │                 │              │                 │
 │                 │ Push: KYC complete             │
 │◄────────────────┤              │                 │
```

### Auth Login Flow

```
User           Web/Mobile        API             DB
 │                 │              │               │
 │ Enter email+pw  │              │               │
 ├────────────────►│              │               │
 │                 │POST /auth/login              │
 │                 ├─────────────►│               │
 │                 │             │ SELECT user    │
 │                 │             ├──────────────►│
 │                 │             │◄──────────────┤
 │                 │             │ verify bcrypt  │
 │                 │             │ issue JWT      │
 │                 │             │ store refresh  │
 │                 │             ├──────────────►│
 │                 │ {accessToken, user}          │
 │                 │◄─────────────┤               │
 │ Logged in       │              │               │
 │◄────────────────┤              │               │
```

---

## 5. Frontend API Contract

All frontend calls use generated hooks from the OpenAPI spec via Orval:

```typescript
// Example: Get accounts
const { data: accounts, isLoading } = useGetAccounts();

// Example: Initiate transfer
const { mutate: initiateTransfer } = useInitiateTransfer();

// Example: Submit onboarding step
const { mutate: submitStep } = useSubmitOnboardingStep();
```

Types, hooks, and Zod schemas are all generated from `lib/api-spec/openapi.yaml`.
