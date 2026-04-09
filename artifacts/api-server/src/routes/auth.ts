import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable, otpCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RegisterBody, LoginBody, VerifyEmailBody, RequestOtpBody } from "@workspace/api-zod";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "nexvault-dev-secret-change-in-prod";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";
const DEMO_MODE = process.env.DEMO_MODE === "true";

function generateAccessToken(userId: string) {
  return jwt.sign({ userId, type: "access" }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function generateRefreshToken(userId: string) {
  return jwt.sign({ userId, type: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    return;
  }

  const { email, password, accountType, firstName, lastName } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    accountType: accountType as "individual" | "business",
    kycStatus: "pending",
    emailVerified: false,
  }).returning();

  if (DEMO_MODE) {
    await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, user.id));
  }

  res.status(201).json({ userId: user.id, nextStep: "onboarding" });
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db.insert(sessionsTable).values({
    userId: user.id,
    refreshToken,
    expiresAt,
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountType: user.accountType,
      kycStatus: user.kycStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
    },
  });
});

// POST /api/auth/verify-email
router.post("/auth/verify-email", async (req, res) => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const { userId } = parsed.data;
  await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, userId));

  res.json({ verified: true, nextStep: "onboarding" });
});

// POST /api/auth/refresh
router.post("/auth/refresh", async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string };
    const [session] = await db.select().from(sessionsTable)
      .where(and(
        eq(sessionsTable.refreshToken, refreshToken),
        gt(sessionsTable.expiresAt, new Date())
      )).limit(1);

    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const accessToken = generateAccessToken(decoded.userId);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    await db.delete(sessionsTable).where(eq(sessionsTable.refreshToken, refreshToken));
  }
  res.clearCookie("refresh_token");
  res.json({ message: "Logged out" });
});

// POST /api/auth/otp/request  (requires auth)
router.post("/auth/otp/request", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = RequestOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const { purpose } = parsed.data;
  const userId = req.userId!;

  const code = DEMO_MODE ? "123456" : generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(otpCodesTable).values({
    userId,
    code,
    purpose,
    expiresAt,
    used: false,
  });

  res.json({
    message: DEMO_MODE ? "OTP sent (demo: use code 123456)" : "OTP sent",
    ...(DEMO_MODE ? { devCode: "123456" } : {}),
  });
});

// POST /api/auth/otp/verify
router.post("/auth/otp/verify", async (req, res) => {
  const { userId, code, purpose } = req.body as {
    userId?: string;
    code?: string;
    purpose?: string;
  };

  if (!userId || !code || !purpose) {
    res.status(400).json({ error: "userId, code, and purpose required" });
    return;
  }

  const [otpRecord] = await db.select().from(otpCodesTable)
    .where(and(
      eq(otpCodesTable.userId, userId),
      eq(otpCodesTable.code, code),
      eq(otpCodesTable.purpose, purpose as "payment_confirm" | "phone_verify" | "email_verify"),
      eq(otpCodesTable.used, false),
      gt(otpCodesTable.expiresAt, new Date())
    ))
    .limit(1);

  if (!otpRecord) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otpRecord.id));

  res.json({ verified: true });
});

export default router;
