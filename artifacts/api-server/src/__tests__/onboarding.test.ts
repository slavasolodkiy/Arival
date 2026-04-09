import { describe, it, expect } from "vitest";

type OnboardingStatus =
  | "not_started"
  | "in_progress"
  | "kyc_pending"
  | "approved"
  | "rejected";

const ALLOWED_TRANSITIONS: Record<OnboardingStatus, OnboardingStatus[]> = {
  not_started: ["in_progress"],
  in_progress: ["kyc_pending", "rejected"],
  kyc_pending: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

const canTransition = (
  from: OnboardingStatus,
  to: OnboardingStatus
): boolean => ALLOWED_TRANSITIONS[from].includes(to);

describe("onboarding state machine", () => {
  it("allows not_started → in_progress", () => {
    expect(canTransition("not_started", "in_progress")).toBe(true);
  });

  it("allows in_progress → kyc_pending", () => {
    expect(canTransition("in_progress", "kyc_pending")).toBe(true);
  });

  it("allows kyc_pending → approved", () => {
    expect(canTransition("kyc_pending", "approved")).toBe(true);
  });

  it("allows kyc_pending → rejected", () => {
    expect(canTransition("kyc_pending", "rejected")).toBe(true);
  });

  it("blocks not_started → approved (skipping steps)", () => {
    expect(canTransition("not_started", "approved")).toBe(false);
  });

  it("blocks approved → in_progress (cannot re-open)", () => {
    expect(canTransition("approved", "in_progress")).toBe(false);
  });

  it("blocks rejected → approved (cannot reverse rejection)", () => {
    expect(canTransition("rejected", "approved")).toBe(false);
  });

  it("terminal states have no allowed transitions", () => {
    expect(ALLOWED_TRANSITIONS["approved"]).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS["rejected"]).toHaveLength(0);
  });
});

describe("flow config branching", () => {
  type Branch = { condition: { field: string; value: string }; nextStep: string };

  const resolveNextStep = (
    defaultNext: string,
    branches: Branch[],
    formData: Record<string, string>
  ): string => {
    for (const branch of branches) {
      const { field, value } = branch.condition;
      if (formData[field] === value) return branch.nextStep;
    }
    return defaultNext;
  };

  it("resolves default next step when no branch matches", () => {
    const result = resolveNextStep(
      "tax_info_general",
      [{ condition: { field: "country_code", value: "US" }, nextStep: "tax_info_fatca" }],
      { country_code: "GB" }
    );
    expect(result).toBe("tax_info_general");
  });

  it("resolves branched step when condition matches (FATCA for US)", () => {
    const result = resolveNextStep(
      "tax_info_general",
      [{ condition: { field: "country_code", value: "US" }, nextStep: "tax_info_fatca" }],
      { country_code: "US" }
    );
    expect(result).toBe("tax_info_fatca");
  });
});
