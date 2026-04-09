import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable, otpCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RegisterBody, LoginBody, VerifyEmailBody, RequestOtpBody } from "@workspace/api-zod";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET || "nexvault-dev-secret-change-in-prod";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

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

  // In dev, auto-verify email
  await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, user.id));

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

// POST /api/auth/otp/request
router.post("/auth/otp/request", async (req, res) => {
  // In a real app, send OTP via SMS/email
  // For dev, just return success
  res.json({ message: "OTP sent (dev: use code 123456)" });
});

export default router;
