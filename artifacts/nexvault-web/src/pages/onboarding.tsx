import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useStartOnboarding, useSubmitOnboardingStep, useGetOnboardingStatus } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ArrowRight, Building2, User, Clock } from "lucide-react";

type FieldDef = {
  id: string;
  type: "text" | "date" | "select" | "radio" | "checkbox" | "country_select";
  label: string;
  required?: boolean;
  maxLength?: number;
  options?: { value: string; label: string }[];
};

type StepDef = {
  id: string;
  title: string;
  type: "form" | "selection" | "terms" | "document_upload" | "selfie";
  description?: string;
  required?: boolean;
  fields: FieldDef[];
  nextStep?: string;
  branching?: Record<string, Record<string, string>>;
};

type FlowConfig = {
  flowId: string;
  flowType: string;
  steps: StepDef[];
};

const COUNTRIES = [
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "SG", label: "Singapore" },
  { value: "AE", label: "UAE" },
  { value: "IN", label: "India" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
  { value: "NL", label: "Netherlands" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "CH", label: "Switzerland" },
  { value: "JP", label: "Japan" },
  { value: "HK", label: "Hong Kong" },
  { value: "OTHER", label: "Other" },
];

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string | boolean | undefined;
  onChange: (val: string | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={!!value}
          onCheckedChange={(v) => onChange(!!v)}
          className="mt-0.5"
        />
        <span className="text-sm">{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</span>
      </label>
    );
  }

  if (field.type === "radio" && field.options) {
    return (
      <div>
        <Label className="text-sm font-medium mb-2 block">{field.label}</Label>
        <RadioGroup
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
          className="space-y-2"
        >
          {field.options.map((opt) => (
            <Label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                value === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <RadioGroupItem value={opt.value} />
              {opt.label}
            </Label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if ((field.type === "select" || field.type === "country_select") && field.options) {
    return (
      <div>
        <Label className="text-sm font-medium mb-1 block">
          {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v)}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "country_select") {
    return (
      <div>
        <Label className="text-sm font-medium mb-1 block">
          {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div>
      <Label className="text-sm font-medium mb-1 block">
        {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        type={field.type === "date" ? "date" : "text"}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        maxLength={field.maxLength}
      />
    </div>
  );
}

function StepRenderer({
  step,
  formData,
  setFormData,
  onContinue,
  isSubmitting,
}: {
  step: StepDef;
  formData: Record<string, string | boolean>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string | boolean>>>;
  onContinue: () => void;
  isSubmitting: boolean;
}) {
  const requiredFields = step.fields.filter((f) => f.required);
  const isValid = requiredFields.every((f) => {
    const v = formData[f.id];
    if (f.type === "checkbox") return !!v;
    return typeof v === "string" && v.trim().length > 0;
  });

  if (step.type === "selfie") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">{step.title}</h1>
        {step.description && (
          <p className="text-muted-foreground mb-8">{step.description}</p>
        )}
        <div className="border-2 border-dashed rounded-xl p-10 text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">Camera capture</p>
          <p className="text-sm text-muted-foreground">
            In a live deployment, your camera would open here. This step is auto-approved in demo mode.
          </p>
        </div>
        <Button onClick={onContinue} disabled={isSubmitting} className="w-full gap-2">
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (step.type === "document_upload") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">{step.title}</h1>
        {step.description && (
          <p className="text-muted-foreground mb-8">{step.description}</p>
        )}
        <div className="space-y-3 mb-8">
          {step.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={formData[field.id]}
              onChange={(v) => setFormData((p) => ({ ...p, [field.id]: v }))}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          In a live deployment, you would upload document photos here. Documents are auto-approved in demo mode.
        </p>
        <Button onClick={onContinue} disabled={isSubmitting} className="w-full gap-2">
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{step.title}</h1>
      {step.description && (
        <p className="text-muted-foreground mb-6 text-sm bg-muted/50 rounded-lg p-3">{step.description}</p>
      )}
      <div className="space-y-4 mb-8">
        {step.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={formData[field.id]}
            onChange={(v) => setFormData((p) => ({ ...p, [field.id]: v }))}
          />
        ))}
      </div>
      <Button onClick={onContinue} disabled={isSubmitting || !isValid} className="w-full gap-2">
        {isSubmitting ? "Saving..." : "Continue"} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function Onboarding() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const [flowType, setFlowType] = useState<"individual" | "business">("individual");
  const [phase, setPhase] = useState<"type" | "flow" | "pending" | "complete">("type");
  const [applicationId, setApplicationId] = useState<string>("");
  const [flowConfig, setFlowConfig] = useState<FlowConfig | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});

  const { mutate: startOnboarding, isPending: isStarting } = useStartOnboarding();
  const { mutate: submitStep, isPending: isSubmitting } = useSubmitOnboardingStep();
  const { data: statusData } = useGetOnboardingStatus({
    query: { enabled: !!token && phase === "complete" },
  });

  const handleStart = () => {
    startOnboarding(
      { data: { flowType, countryCode: "GB" } },
      {
        onSuccess: (data) => {
          setApplicationId(data.applicationId);
          if (data.status === "approved") {
            setPhase("complete");
            return;
          }
          setFlowConfig(data.flowConfig as FlowConfig);
          setCurrentStepId(data.currentStep);
          setFormData({});
          setPhase("flow");
        },
      }
    );
  };

  const currentStep = flowConfig?.steps.find((s) => s.id === currentStepId) ?? null;

  const stepIndex = flowConfig?.steps.findIndex((s) => s.id === currentStepId) ?? 0;
  const totalSteps = flowConfig?.steps.length ?? 1;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const handleContinue = () => {
    if (!currentStep) return;

    const data = { ...formData };

    submitStep(
      { data: { applicationId, stepId: currentStepId, data } },
      {
        onSuccess: (res) => {
          setFormData({});

          if (res.status === "approved" || res.nextStep === "complete") {
            setPhase("complete");
          } else if (res.status === "kyc_pending" || res.nextStep === "kyc_review") {
            setPhase("pending");
          } else if (res.nextStep === "REDIRECT_BUSINESS_FLOW") {
            setFlowType("business");
            startOnboarding(
              { data: { flowType: "business", countryCode: "GB" } },
              {
                onSuccess: (d) => {
                  setApplicationId(d.applicationId);
                  setFlowConfig(d.flowConfig as FlowConfig);
                  setCurrentStepId(d.currentStep);
                },
              }
            );
          } else {
            setCurrentStepId(res.nextStep);
          }
        },
      }
    );
  };

  if (phase === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="max-w-md w-full mx-auto text-center p-8">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Account activated</h1>
          <p className="text-muted-foreground mb-6">
            Your identity has been verified and your accounts are ready.
          </p>
          <Button onClick={() => setLocation("/dashboard")} className="w-full gap-2">
            Go to dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="max-w-md w-full mx-auto text-center p-8">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Application under review</h1>
          <p className="text-muted-foreground mb-6">
            Your application has been submitted and is being reviewed by our compliance team. You will receive an email once the review is complete (typically 1-2 business days).
          </p>
          <Button variant="outline" onClick={() => setLocation("/")} className="w-full">
            Return to home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            N
          </div>
          <span className="font-bold text-xl">Nexvault</span>
        </div>

        {/* Progress bar */}
        {phase === "flow" && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                Step {stepIndex + 1} of {totalSteps}
              </p>
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Account type selection */}
        {phase === "type" && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Open your account</h1>
            <p className="text-muted-foreground mb-8">Choose your account type to get started</p>
            <div className="grid gap-3 mb-8">
              <div
                onClick={() => setFlowType("individual")}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  flowType === "individual"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Personal Account</p>
                  <p className="text-sm text-muted-foreground">
                    For individuals — USD, EUR, GBP accounts
                  </p>
                </div>
              </div>
              <div
                onClick={() => setFlowType("business")}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  flowType === "business"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Business Account</p>
                  <p className="text-sm text-muted-foreground">
                    For startups and entrepreneurs
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleStart} disabled={isStarting} className="w-full gap-2">
              {isStarting ? "Starting..." : "Get started"} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Config-driven flow */}
        {phase === "flow" && currentStep && (
          <StepRenderer
            step={currentStep}
            formData={formData}
            setFormData={setFormData}
            onContinue={handleContinue}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
