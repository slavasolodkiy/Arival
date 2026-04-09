import { describe, it, expect } from "vitest";

const OTP_THRESHOLD_USD = 500;

const requiresOtp = (amountUsd: number): boolean =>
  amountUsd >= OTP_THRESHOLD_USD;

const calculateFee = (amount: number, feeRate = 0.005): number =>
  Math.round(amount * feeRate * 100) / 100;

describe("payment OTP threshold", () => {
  it("requires OTP for transfers >= $500", () => {
    expect(requiresOtp(500)).toBe(true);
    expect(requiresOtp(1000)).toBe(true);
    expect(requiresOtp(500.01)).toBe(true);
  });

  it("does NOT require OTP for transfers < $500", () => {
    expect(requiresOtp(499.99)).toBe(false);
    expect(requiresOtp(100)).toBe(false);
    expect(requiresOtp(0.01)).toBe(false);
  });
});

describe("fee calculation", () => {
  it("calculates 0.5% fee correctly", () => {
    expect(calculateFee(1000)).toBe(5);
    expect(calculateFee(200)).toBe(1);
    expect(calculateFee(333)).toBe(1.67);
  });

  it("minimum fee rounds to 2 decimal places", () => {
    const fee = calculateFee(1);
    expect(fee.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
  });
});

describe("account balance validation", () => {
  const canAfford = (balance: number, amount: number, fee: number): boolean =>
    balance >= amount + fee;

  it("allows transfer when balance is sufficient", () => {
    expect(canAfford(1000, 900, 4.5)).toBe(true);
    expect(canAfford(500, 200, 1)).toBe(true);
  });

  it("blocks transfer when balance is insufficient", () => {
    expect(canAfford(100, 200, 1)).toBe(false);
    expect(canAfford(500, 499, 5)).toBe(false);
  });
});
