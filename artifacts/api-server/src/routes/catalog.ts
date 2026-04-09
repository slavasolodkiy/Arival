/**
 * Onboarding Catalog & Preview API
 *
 * GET  /api/onboarding/catalog  — structured onboarding config for a given flow/country/language
 * POST /api/onboarding/preview  — branch-aware next-step computation given answers so far
 *
 * Both endpoints are read-only and require no database access — all data
 * comes from the JSON config files under config/onboarding/.
 */
import { Router, Request, Response } from "express";
import { z } from "zod";

import countriesData from "../../../../config/onboarding/catalog/countries.json" assert { type: "json" };
import languagesData from "../../../../config/onboarding/catalog/languages.json" assert { type: "json" };
import identityDocsData from "../../../../config/onboarding/catalog/identity-documents.json" assert { type: "json" };
import branchRulesData from "../../../../config/onboarding/catalog/branch-rules.json" assert { type: "json" };
import individualFlow from "../../../../config/onboarding/individual-flow.json" assert { type: "json" };
import businessFlow from "../../../../config/onboarding/business-flow.json" assert { type: "json" };

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────

type FlowType = "individual" | "business";

type BranchRule = {
  ruleId: string;
  stepId: string;
  field: string;
  condition: string;
  value?: string | string[];
  nextStep: string;
  reason: string;
};

type CountryEntry = {
  code: string;
  name: string;
  riskTier: string;
  available: boolean;
  requiresFatca: boolean;
  region: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function getSupportedLanguages(country: string): string[] {
  const byCountry = (languagesData as { byCountry: Record<string, string[]> }).byCountry;
  return byCountry[country] ?? [languagesData.fallback];
}

function getAvailableDocuments(country: string): string[] {
  const byCountry = (identityDocsData as { byCountry: Record<string, string[]> }).byCountry;
  return byCountry[country] ?? byCountry["default"] ?? ["passport"];
}

function getCountryInfo(code: string): CountryEntry | undefined {
  return (countriesData.countries as CountryEntry[]).find(c => c.code === code);
}

function getFlow(flowType: FlowType) {
  return flowType === "individual" ? individualFlow : businessFlow;
}

function getLocalizedLabel(
  labelOrObj: string | Record<string, string>,
  language: string
): string {
  if (typeof labelOrObj === "string") return labelOrObj;
  return labelOrObj[language] ?? labelOrObj["en"] ?? Object.values(labelOrObj)[0] ?? "";
}

/**
 * Apply a single branch rule given the answers for a step.
 * Returns the nextStep if the rule matches, undefined otherwise.
 */
function applyRule(
  rule: BranchRule,
  stepAnswers: Record<string, string>
): string | undefined {
  const fieldValue = stepAnswers[rule.field];
  if (rule.condition === "_default") return rule.nextStep;
  if (rule.condition === "eq" && fieldValue === rule.value) return rule.nextStep;
  if (rule.condition === "in" && Array.isArray(rule.value) && rule.value.includes(fieldValue)) {
    return rule.nextStep;
  }
  return undefined;
}

/**
 * Find which branch rule fired for a step, given step answers.
 * Returns { nextStep, rule } or undefined if no rule matches.
 */
function resolveBranch(
  flowType: FlowType,
  stepId: string,
  stepAnswers: Record<string, string>
): { nextStep: string; rule: BranchRule } | undefined {
  const rules = (branchRulesData[flowType] as BranchRule[]).filter(
    r => r.stepId === stepId
  );
  for (const rule of rules) {
    const next = applyRule(rule, stepAnswers);
    if (next !== undefined) return { nextStep: next, rule };
  }
  return undefined;
}

/**
 * Find the linear next step for a step that has no branching.
 */
function resolveLinear(flowType: FlowType, stepId: string): string | undefined {
  const linear = (branchRulesData.linearSteps as Record<string, Record<string, string>>)[flowType];
  return linear?.[stepId];
}

/**
 * Given answers so far (keyed by stepId), walk through the flow and determine:
 * - completedSteps: steps whose answers are present
 * - currentStep: the next step that has no answers yet
 * - branchReason: explanation for why the current step was chosen
 */
function computeProgress(
  flowType: FlowType,
  answersSoFar: Record<string, Record<string, string>>
): {
  completedSteps: string[];
  nextStepId: string;
  branchReason: string;
  missingRequirements: string[];
} {
  const flow = getFlow(flowType);
  const firstStepId = flow.steps[0]?.id ?? "";
  const completed: string[] = [];
  let branchReason = "Start of flow.";

  let current = firstStepId;

  for (let i = 0; i < 50; i++) {
    if (!current || current === "SUBMIT_KYC" || current === "REDIRECT_BUSINESS_FLOW") break;

    const stepAnswers = answersSoFar[current];
    if (!stepAnswers || Object.keys(stepAnswers).length === 0) {
      break;
    }

    completed.push(current);

    const branchResult = resolveBranch(flowType, current, stepAnswers);
    if (branchResult) {
      branchReason = branchResult.rule.reason;
      current = branchResult.nextStep;
    } else {
      const linearNext = resolveLinear(flowType, current);
      if (linearNext) {
        branchReason = `Linear step after '${current}'.`;
        current = linearNext;
      } else {
        const stepDef = flow.steps.find(s => s.id === current);
        const nextStep = (stepDef as { nextStep?: string }).nextStep;
        if (nextStep) {
          branchReason = `Linear step after '${current}'.`;
          current = nextStep;
        } else {
          break;
        }
      }
    }
  }

  const currentStep = flow.steps.find(s => s.id === current);
  const missingRequirements: string[] = [];
  if (currentStep) {
    for (const field of (currentStep.fields ?? [])) {
      if (field.required && !answersSoFar[current]?.[field.id]) {
        missingRequirements.push(field.id);
      }
    }
  }

  return {
    completedSteps: completed,
    nextStepId: current,
    branchReason,
    missingRequirements,
  };
}

// ─── GET /api/onboarding/catalog ─────────────────────────────────────────

const CatalogQuerySchema = z.object({
  flowType: z.enum(["individual", "business"]).default("individual"),
  country: z.string().length(2).toUpperCase().default("GB"),
  language: z.enum(["en", "de", "fr", "es"]).default("en"),
});

router.get("/onboarding/catalog", (req: Request, res: Response) => {
  const parsed = CatalogQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
    return;
  }

  const { flowType, country, language } = parsed.data;

  const countryInfo = getCountryInfo(country);
  if (!countryInfo) {
    res.status(404).json({ error: `Country '${country}' not found in catalog.` });
    return;
  }

  if (!countryInfo.available) {
    res.status(422).json({
      error: `Country '${country}' (${countryInfo.name}) is not currently available.`,
      riskTier: countryInfo.riskTier,
    });
    return;
  }

  const flow = getFlow(flowType as FlowType);
  const supportedLanguages = getSupportedLanguages(country);
  const resolvedLanguage = supportedLanguages.includes(language) ? language : languagesData.fallback;

  const localizedSteps = flow.steps.map(step => ({
    id: step.id,
    title: getLocalizedLabel(step.title, resolvedLanguage),
    type: step.type,
    required: step.required,
    description: step.description
      ? getLocalizedLabel(step.description as string, resolvedLanguage)
      : undefined,
    fields: (step.fields ?? []).map((f: Record<string, unknown>) => ({
      id: f.id,
      type: f.type,
      label: getLocalizedLabel(f.label as string | Record<string, string>, resolvedLanguage),
      required: f.required,
      ...(f.options ? {
        options: (f.options as Array<Record<string, unknown>>).map(o => ({
          value: o.value,
          label: getLocalizedLabel(o.label as string | Record<string, string>, resolvedLanguage),
        })),
      } : {}),
    })),
  }));

  const availableDocuments = getAvailableDocuments(country);
  const branchRules = (branchRulesData[flowType as FlowType] as BranchRule[]);

  res.json({
    flowType,
    country,
    language: resolvedLanguage,
    languageFallback: resolvedLanguage !== language,
    countryInfo,
    supportedLanguages,
    availableDocuments,
    steps: localizedSteps,
    branchRules,
    linearSteps: (branchRulesData.linearSteps as Record<string, unknown>)[flowType],
  });
});

// ─── POST /api/onboarding/preview ────────────────────────────────────────

const PreviewBodySchema = z.object({
  flowType: z.enum(["individual", "business"]),
  country: z.string().length(2).toUpperCase(),
  language: z.enum(["en", "de", "fr", "es"]).default("en"),
  answersSoFar: z.record(z.string(), z.record(z.string(), z.string())).default({}),
});

router.post("/onboarding/preview", (req: Request, res: Response) => {
  const parsed = PreviewBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const { flowType, country, language, answersSoFar } = parsed.data;

  const countryInfo = getCountryInfo(country);
  if (!countryInfo) {
    res.status(404).json({ error: `Country '${country}' not found in catalog.` });
    return;
  }

  const supportedLanguages = getSupportedLanguages(country);
  const resolvedLanguage = supportedLanguages.includes(language) ? language : languagesData.fallback;

  const { completedSteps, nextStepId, branchReason, missingRequirements } =
    computeProgress(flowType as FlowType, answersSoFar);

  const flow = getFlow(flowType as FlowType);
  const nextStepDef = flow.steps.find(s => s.id === nextStepId);

  if (!nextStepDef && nextStepId !== "SUBMIT_KYC" && nextStepId !== "REDIRECT_BUSINESS_FLOW") {
    res.status(422).json({
      error: `Cannot resolve next step '${nextStepId}' in ${flowType} flow.`,
      completedSteps,
    });
    return;
  }

  const availableDocuments = getAvailableDocuments(country);

  const allowedAnswers: Record<string, string[]> = {};
  if (nextStepDef) {
    for (const field of (nextStepDef.fields ?? [])) {
      if (field.type === "radio" || field.type === "select") {
        let opts = ((field as { options?: Array<{ value: string }> }).options ?? []).map(o => o.value);
        if (field.id === "document_type") {
          opts = opts.filter(v => availableDocuments.includes(v));
        }
        allowedAnswers[field.id] = opts;
      }
    }
  }

  const localizedNextStep = nextStepDef
    ? {
        id: nextStepDef.id,
        title: getLocalizedLabel(nextStepDef.title, resolvedLanguage),
        type: nextStepDef.type,
        fields: (nextStepDef.fields ?? []).map((f: Record<string, unknown>) => ({
          id: f.id,
          type: f.type,
          label: getLocalizedLabel(f.label as string | Record<string, string>, resolvedLanguage),
          required: f.required,
          ...(f.options ? {
            options: (f.options as Array<Record<string, unknown>>).map(o => ({
              value: o.value,
              label: getLocalizedLabel(o.label as string | Record<string, string>, resolvedLanguage),
            })),
          } : {}),
        })),
      }
    : null;

  res.json({
    flowType,
    country,
    language: resolvedLanguage,
    nextStep: localizedNextStep,
    nextStepId,
    allowedAnswers,
    branchReason,
    completedSteps,
    missingRequirements,
    isComplete: nextStepId === "SUBMIT_KYC" || nextStepId === "REDIRECT_BUSINESS_FLOW",
  });
});

export default router;
