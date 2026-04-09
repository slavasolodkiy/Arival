/**
 * Route-level integration tests using supertest.
 * These tests use the real Express app with a mocked database layer.
 * Each suite verifies HTTP-level behavior: auth guards, schema validation,
 * and business logic that is deterministic without a real database.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";

process.env.SESSION_SECRET = "nexvault-test-secret";
process.env.DEMO_MODE = "true";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_APP_ID = "00000000-0000-0000-0000-000000000002";

const mockUser = {
  id: TEST_USER_ID,
  email: "integration@test.com",
  passwordHash: "$2b$10$fakehash",
  firstName: "Integration",
  lastName: "Test",
  phone: null,
  accountType: "individual" as const,
  kycStatus: "not_started" as const,
  emailVerified: true,
  phoneVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockApplication = {
  id: TEST_APP_ID,
  userId: TEST_USER_ID,
  flowType: "individual" as const,
  countryCode: "GB",
  currentStep: "personal_info",
  status: "in_progress" as const,
  completedSteps: ["account_type"],
  stepData: { account_type: { account_type: "individual" } },
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("@workspace/db", () => {
  function makeSelect(result: unknown[]) {
    return () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(result),
          orderBy: () => ({
            limit: () => Promise.resolve(result),
          }),
        }),
        orderBy: () => ({
          limit: () => Promise.resolve(result),
        }),
      }),
    });
  }

  return {
    db: {
      select: makeSelect([mockUser]),
      insert: () => ({ values: () => ({ returning: () => Promise.resolve([mockApplication]) }) }),
      update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
    },
    usersTable: { id: "id", email: "email", kycStatus: "kycStatus" },
    onboardingApplicationsTable: {
      id: "id", userId: "userId", currentStep: "currentStep",
      status: "status", flowType: "flowType",
    },
    accountsTable: { id: "id", userId: "userId" },
    notificationsTable: { id: "id", userId: "userId", type: "type", title: "title", body: "body", read: "read" },
    transactionsTable: { id: "id", accountId: "accountId", createdAt: "createdAt" },
    paymentsTable: { id: "id", userId: "userId" },
    cardsTable: { id: "id", userId: "userId", createdAt: "createdAt" },
    otpCodesTable: { id: "id", userId: "userId", code: "code", purpose: "purpose", used: "used", expiresAt: "expiresAt" },
    beneficiariesTable: { id: "id", userId: "userId" },
  };
});

function makeAuthToken(userId: string = TEST_USER_ID): string {
  return jwt.sign({ userId }, process.env.SESSION_SECRET!, { expiresIn: "1h" });
}

let app: Express;

beforeAll(async () => {
  const mod = await import("../app");
  app = mod.default;
});

// ─── Auth middleware guard ─────────────────────────────────────────────────

describe("Auth guards — 401 without token", () => {
  it("GET /api/accounts requires auth", async () => {
    const res = await request(app).get("/api/accounts");
    expect(res.status).toBe(401);
  });

  it("POST /api/onboarding/start requires auth", async () => {
    const res = await request(app).post("/api/onboarding/start").send({});
    expect(res.status).toBe(401);
  });

  it("POST /api/onboarding/step requires auth", async () => {
    const res = await request(app).post("/api/onboarding/step").send({});
    expect(res.status).toBe(401);
  });

  it("POST /api/payments/transfer/initiate requires auth", async () => {
    const res = await request(app).post("/api/payments/transfer/initiate").send({});
    expect(res.status).toBe(401);
  });

  it("POST /api/payments/transfer/confirm requires auth", async () => {
    const res = await request(app).post("/api/payments/transfer/confirm").send({});
    expect(res.status).toBe(401);
  });
});

// ─── Schema validation (Zod) ──────────────────────────────────────────────

describe("Schema validation — 400 for invalid bodies", () => {
  it("POST /api/auth/login rejects invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "pass" });
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/login rejects missing password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "valid@email.com" });
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/register rejects short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "short", accountType: "individual" });
    expect(res.status).toBe(400);
  });

  it("POST /api/onboarding/start rejects invalid flowType", async () => {
    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/onboarding/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ flowType: "invalid", countryCode: "GB" });
    expect(res.status).toBe(400);
  });

  it("POST /api/onboarding/start rejects missing countryCode", async () => {
    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/onboarding/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ flowType: "individual" });
    expect(res.status).toBe(400);
  });

  it("POST /api/onboarding/step rejects missing stepId", async () => {
    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/onboarding/step")
      .set("Authorization", `Bearer ${token}`)
      .send({ applicationId: TEST_APP_ID, data: {} });
    expect(res.status).toBe(400);
  });

  it("POST /api/payments/transfer/confirm rejects missing otpCode", async () => {
    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/payments/transfer/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ transferId: "tx-123" });
    expect([400, 404]).toContain(res.status);
  });

  it("POST /api/auth/otp/verify rejects missing code", async () => {
    const res = await request(app)
      .post("/api/auth/otp/verify")
      .send({ userId: TEST_USER_ID, purpose: "payment_confirm" });
    expect(res.status).toBe(400);
  });
});

// ─── Step-order enforcement ────────────────────────────────────────────────

describe("Onboarding — step-order enforcement (mocked DB)", () => {
  it("rejects submitting a step that is not the current step", async () => {
    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/onboarding/step")
      .set("Authorization", `Bearer ${token}`)
      .send({
        applicationId: TEST_APP_ID,
        stepId: "tax_info_general",
        data: { tax_country: "GB" },
      });
    expect([400, 401, 404]).toContain(res.status);
    if (res.status === 400) {
      expect(res.body).toMatchObject({ error: "Step out of order" });
    }
  });
});

// ─── OTP-required transfer confirmation ───────────────────────────────────

describe("Payments — OTP confirmation guard", () => {
  it("POST /api/payments/transfer/confirm returns non-200 for invalid OTP", async () => {
    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/payments/transfer/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ transferId: "non-existent-tx", otpCode: "000000" });
    expect([400, 404, 410]).toContain(res.status);
  });
});

// ─── Business redirect: REDIRECT_BUSINESS_FLOW must not approve ───────────

describe("Onboarding — business redirect does not premature-approve", () => {
  it("REDIRECT_BUSINESS_FLOW is not in terminal signals — the step response is not approved", async () => {
    type OnboardingModule = { TERMINAL_SIGNALS: Set<string> };
    const mod = await import("../routes/onboarding") as OnboardingModule;
    expect(mod.TERMINAL_SIGNALS.has("REDIRECT_BUSINESS_FLOW")).toBe(false);
    expect(mod.TERMINAL_SIGNALS.has("SUBMIT_KYC")).toBe(true);
  });
});
