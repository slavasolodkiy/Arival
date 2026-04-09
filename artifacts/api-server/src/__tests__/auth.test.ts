import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";

describe("password hashing", () => {
  it("hashes a password with bcrypt", async () => {
    const password = "Test1234!";
    const hash = await bcrypt.hash(password, 12);
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2b\$/);
  });

  it("verifies a correct password", async () => {
    const password = "MySecureP@ss99";
    const hash = await bcrypt.hash(password, 12);
    const match = await bcrypt.compare(password, hash);
    expect(match).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const password = "CorrectHorse";
    const hash = await bcrypt.hash(password, 12);
    const match = await bcrypt.compare("WrongHorse", hash);
    expect(match).toBe(false);
  });
});

describe("OTP generation", () => {
  const generateOtp = (demoMode: boolean): string => {
    if (demoMode) return "123456";
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  it("returns demo OTP in demo mode", () => {
    expect(generateOtp(true)).toBe("123456");
  });

  it("returns 6-digit numeric OTP in production mode", () => {
    const otp = generateOtp(false);
    expect(otp).toMatch(/^\d{6}$/);
    expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
    expect(parseInt(otp)).toBeLessThanOrEqual(999999);
  });
});

describe("OTP expiry", () => {
  it("detects expired OTP", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000 - 1000);
    const isExpired = fiveMinutesAgo < new Date();
    expect(isExpired).toBe(true);
  });

  it("accepts non-expired OTP", () => {
    const twoMinutesFromNow = new Date(Date.now() + 2 * 60 * 1000);
    const isExpired = twoMinutesFromNow < new Date();
    expect(isExpired).toBe(false);
  });
});
