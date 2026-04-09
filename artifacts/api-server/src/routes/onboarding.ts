import { Router } from "express";
import { db } from "@workspace/db";
import { onboardingApplicationsTable, usersTable, accountsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import { StartOnboardingBody, SubmitOnboardingStepBody } from "@workspace/api-zod";
import individualFlow from "../../../../config/onboarding/individual-flow.json" assert { type: "json" };
import businessFlow from "../../../../config/onboarding/business-flow.json" assert { type: "json" };

const router = Router();

const DEMO_MODE = process.env.DEMO_MODE === "true";

type FlowConfig = typeof individualFlow | typeof businessFlow;

const FLOW_CONFIGS: Record<string, FlowConfig> = {
  individual: individualFlow,
  business: businessFlow,
};

export const TERMINAL_SIGNALS = new Set(["SUBMIT_KYC", "SUBMIT"]);

// POST /api/onboarding/start
router.post("/onboarding/start", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = StartOnboardingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    return;
  }

  const { flowType, countryCode } = parsed.data;

  const [existing] = await db.select().from(onboardingApplicationsTable)
    .where(eq(onboardingApplicationsTable.userId, req.userId!))
    .limit(1);

  if (existing) {
    const flowConfig = FLOW_CONFIGS[existing.flowType];
    res.json({
      applicationId: existing.id,
      currentStep: existing.currentStep,
      status: existing.status,
      flowConfig,
    });
    return;
  }

  const flowConfig = FLOW_CONFIGS[flowType];
  if (!flowConfig) {
    res.status(400).json({ error: "Invalid flow type" });
    return;
  }

  const firstStep = flowConfig.steps[0]?.id ?? "personal_info";

  const [application] = await db.insert(onboardingApplicationsTable).values({
    userId: req.userId!,
    flowType: flowType as "individual" | "business",
    countryCode,
    currentStep: firstStep,
    status: "in_progress",
  }).returning();

  res.json({
    applicationId: application.id,
    currentStep: application.currentStep,
    status: application.status,
    flowConfig,
  });
});

// POST /api/onboarding/step
router.post("/onboarding/step", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = SubmitOnboardingStepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    return;
  }

  const { applicationId, stepId, data } = parsed.data;

  const [application] = await db.select().from(onboardingApplicationsTable)
    .where(eq(onboardingApplicationsTable.id, applicationId))
    .limit(1);

  if (!application || application.userId !== req.userId) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  if (application.status === "approved" || application.status === "rejected") {
    res.status(409).json({ error: `Application is already ${application.status}` });
    return;
  }

  // Strict state machine: only the current step may be submitted
  if (application.currentStep !== stepId) {
    res.status(400).json({
      error: "Step out of order",
      expected: application.currentStep,
      received: stepId,
    });
    return;
  }

  const flowConfig = FLOW_CONFIGS[application.flowType];
  if (!flowConfig) {
    res.status(500).json({ error: "Flow config not found" });
    return;
  }

  const stepIndex = flowConfig.steps.findIndex(s => s.id === stepId);
  const step = flowConfig.steps[stepIndex];

  if (!step) {
    res.status(400).json({ error: "Invalid step" });
    return;
  }

  // Determine next step from config
  let nextStep: string = flowConfig.steps[stepIndex + 1]?.id ?? "SUBMIT_KYC";
  if ("nextStep" in step && step.nextStep) {
    nextStep = step.nextStep as string;
  }

  // Handle branching
  if ("branching" in step && step.branching) {
    const branching = step.branching as Record<string, Record<string, string>>;
    for (const [fieldId, branchMap] of Object.entries(branching)) {
      const value = (data as Record<string, unknown>)[fieldId];
      if (value && typeof value === "string") {
        const branchTarget = branchMap[value] ?? branchMap["_default"];
        if (branchTarget) {
          nextStep = branchTarget;
          break;
        }
      }
    }
  }

  // Handle business flow redirect: switch application to business flow
  if (nextStep === "REDIRECT_BUSINESS_FLOW") {
    const businessFlowConfig = FLOW_CONFIGS["business"];
    const firstBusinessStep = businessFlowConfig.steps[0]?.id ?? "business_info";
    const completedStepsSoFar = Array.isArray(application.completedSteps)
      ? [...(application.completedSteps as string[]), stepId]
      : [stepId];

    await db.update(onboardingApplicationsTable)
      .set({
        flowType: "business",
        currentStep: firstBusinessStep,
        stepData: { ...((application.stepData as Record<string, unknown>) ?? {}), [stepId]: data },
        completedSteps: completedStepsSoFar,
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(onboardingApplicationsTable.id, applicationId));

    res.json({
      stepId,
      nextStep: firstBusinessStep,
      status: "in_progress",
      flowConfig: businessFlowConfig,
    });
    return;
  }

  const completedSteps = Array.isArray(application.completedSteps)
    ? [...(application.completedSteps as string[]), stepId]
    : [stepId];

  let status: "in_progress" | "kyc_pending" | "approved" | "rejected" = "in_progress";

  if (TERMINAL_SIGNALS.has(nextStep)) {
    if (DEMO_MODE) {
      // Auto-approve in demo mode
      status = "approved";
      nextStep = "complete";

      await db.update(usersTable)
        .set({ kycStatus: "approved" })
        .where(eq(usersTable.id, req.userId!));

      const existingAccounts = await db.select().from(accountsTable)
        .where(eq(accountsTable.userId, req.userId!));

      if (existingAccounts.length === 0) {
        const suffix = () => Math.random().toString(36).substring(2, 18).toUpperCase();
        const rnd2 = () => Math.floor(10 + Math.random() * 90).toString();

        await db.insert(accountsTable).values([
          {
            userId: req.userId!,
            currency: "USD",
            iban: `US${rnd2()}NEXV0001${suffix()}`,
            accountNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
            sortCode: "04-00-04",
            balance: "12500.00",
            availableBalance: "12500.00",
            status: "active",
          },
          {
            userId: req.userId!,
            currency: "EUR",
            iban: `DE${rnd2()}NEXV0001${suffix()}`,
            accountNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
            balance: "8200.00",
            availableBalance: "8200.00",
            status: "active",
          },
          {
            userId: req.userId!,
            currency: "GBP",
            iban: `GB${rnd2()}NEXV0001${suffix()}`,
            accountNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
            sortCode: "04-00-04",
            balance: "3750.50",
            availableBalance: "3750.50",
            status: "active",
          },
        ]);
      }

      await db.insert(notificationsTable).values({
        userId: req.userId!,
        type: "kyc",
        title: "Account Verified",
        body: "Your identity has been verified. Your Nexvault accounts are now ready.",
        read: false,
      });
    } else {
      // In production, move to KYC review queue
      status = "kyc_pending";
      nextStep = "kyc_review";
    }
  }

  // Merge step data
  const existingStepData = (application.stepData as Record<string, unknown>) ?? {};
  const updatedStepData = { ...existingStepData, [stepId]: data };

  await db.update(onboardingApplicationsTable)
    .set({
      currentStep: nextStep,
      stepData: updatedStepData,
      completedSteps,
      status,
      updatedAt: new Date(),
    })
    .where(eq(onboardingApplicationsTable.id, applicationId));

  res.json({ stepId, nextStep, status });
});

// GET /api/onboarding/status
router.get("/onboarding/status", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const [application] = await db.select().from(onboardingApplicationsTable)
    .where(eq(onboardingApplicationsTable.userId, req.userId!))
    .limit(1);

  if (!application) {
    res.json({
      applicationId: "",
      status: "in_progress" as const,
      currentStep: "not_started",
      completedSteps: [],
      kycStatus: "not_started",
    });
    return;
  }

  res.json({
    applicationId: application.id,
    status: application.status,
    currentStep: application.currentStep,
    completedSteps: Array.isArray(application.completedSteps) ? application.completedSteps : [],
    kycStatus: application.status === "approved" ? "approved" : "not_started",
  });
});

export default router;
