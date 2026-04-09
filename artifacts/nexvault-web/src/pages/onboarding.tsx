import { useState } from "react";
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
import { CheckCircle, ArrowRight, Building2, User } from "lucide-react";

export default function Onboarding() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const [flowType, setFlowType] = useState<"individual" | "business">("individual");
  const [step, setStep] = useState<"type" | "start" | "personal" | "country" | "documents" | "selfie" | "funding" | "terms" | "complete">("type");
  const [applicationId, setApplicationId] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});

  const { mutate: startOnboarding, isPending: isStarting } = useStartOnboarding();
  const { mutate: submitStep, isPending: isSubmitting } = useSubmitOnboardingStep();
  const { data: status } = useGetOnboardingStatus({ query: { enabled: !!token && step === "complete" } });

  const handleStart = () => {
    startOnboarding({
      data: { flowType, countryCode: "GB" }
    }, {
      onSuccess: (data) => {
        setApplicationId(data.applicationId);
        setStep("personal");
      }
    });
  };

  const handleStep = (stepId: string, data: Record<string, unknown>, nextStepOverride?: string) => {
    submitStep({
      data: { applicationId, stepId, data }
    }, {
      onSuccess: (res) => {
        if (res.status === "approved" || res.nextStep === "complete") {
          setStep("complete");
        } else {
          setStep((nextStepOverride ?? res.nextStep) as typeof step);
        }
      }
    });
  };

  const progress = {
    type: 0,
    start: 5,
    personal: 20,
    country: 35,
    documents: 55,
    selfie: 70,
    funding: 85,
    terms: 95,
    complete: 100,
  }[step];

  if (step === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="max-w-md w-full mx-auto text-center p-8">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Account activated</h1>
          <p className="text-muted-foreground mb-6">Your identity has been verified and your accounts are ready.</p>
          <Button onClick={() => setLocation("/dashboard")} className="w-full gap-2">
            Go to dashboard <ArrowRight className="w-4 h-4" />
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
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">N</div>
          <span className="font-bold text-xl">Nexvault</span>
        </div>

        {step !== "type" && (
          <div className="mb-8">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-2">{progress}% complete</p>
          </div>
        )}

        {step === "type" && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Open your account</h1>
            <p className="text-muted-foreground mb-8">Choose your account type to get started</p>
            <div className="grid gap-3 mb-8">
              <div
                onClick={() => setFlowType("individual")}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${flowType === "individual" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Personal Account</p>
                  <p className="text-sm text-muted-foreground">For individuals — USD, EUR, GBP accounts</p>
                </div>
              </div>
              <div
                onClick={() => setFlowType("business")}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${flowType === "business" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Business Account</p>
                  <p className="text-sm text-muted-foreground">For startups and entrepreneurs</p>
                </div>
              </div>
            </div>
            <Button onClick={handleStart} disabled={isStarting} className="w-full gap-2">
              {isStarting ? "Starting..." : "Get started"} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === "personal" && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Personal information</h1>
            <p className="text-muted-foreground mb-8">Tell us about yourself</p>
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First name</Label>
                  <Input className="mt-1" value={(formData.first_name as string) ?? ""} onChange={e => setFormData(p => ({...p, first_name: e.target.value}))} />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input className="mt-1" value={(formData.last_name as string) ?? ""} onChange={e => setFormData(p => ({...p, last_name: e.target.value}))} />
                </div>
              </div>
              <div>
                <Label>Date of birth</Label>
                <Input type="date" className="mt-1" value={(formData.date_of_birth as string) ?? ""} onChange={e => setFormData(p => ({...p, date_of_birth: e.target.value}))} />
              </div>
              <div>
                <Label>Nationality</Label>
                <Select value={(formData.nationality as string) ?? ""} onValueChange={v => setFormData(p => ({...p, nationality: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select nationality" /></SelectTrigger>
                  <SelectContent>
                    {["United Kingdom", "United States", "Germany", "France", "Singapore", "UAE", "India", "Other"].map(n => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => handleStep("personal_info", formData)} disabled={isSubmitting || !formData.first_name || !formData.last_name} className="w-full gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === "country" && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Country of residence</h1>
            <p className="text-muted-foreground mb-8">Where are you based?</p>
            <div className="space-y-4 mb-8">
              <div>
                <Label>Country</Label>
                <Select value={(formData.country_code as string) ?? ""} onValueChange={v => setFormData(p => ({...p, country_code: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {[{v:"GB",l:"United Kingdom"},{v:"US",l:"United States"},{v:"DE",l:"Germany"},{v:"FR",l:"France"},{v:"SG",l:"Singapore"},{v:"AE",l:"UAE"},{v:"IN",l:"India"}].map(c => (
                      <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Address line 1</Label>
                <Input className="mt-1" value={(formData.address_line_1 as string) ?? ""} onChange={e => setFormData(p => ({...p, address_line_1: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input className="mt-1" value={(formData.city as string) ?? ""} onChange={e => setFormData(p => ({...p, city: e.target.value}))} />
                </div>
                <div>
                  <Label>Postcode</Label>
                  <Input className="mt-1" value={(formData.postcode as string) ?? ""} onChange={e => setFormData(p => ({...p, postcode: e.target.value}))} />
                </div>
              </div>
            </div>
            <Button onClick={() => handleStep("country_of_residence", formData, "documents")} disabled={isSubmitting || !formData.country_code} className="w-full gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === "documents" && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Identity document</h1>
            <p className="text-muted-foreground mb-8">Select the document you will use to verify your identity</p>
            <RadioGroup value={(formData.document_type as string) ?? "passport"} onValueChange={v => setFormData(p => ({...p, document_type: v}))} className="space-y-3 mb-8">
              {[{v:"passport",l:"Passport"},{v:"national_id",l:"National ID Card"},{v:"driving_licence",l:"Driving Licence"}].map(d => (
                <Label key={d.v} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${formData.document_type === d.v || (!formData.document_type && d.v === "passport") ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value={d.v} />
                  {d.l}
                </Label>
              ))}
            </RadioGroup>
            <p className="text-sm text-muted-foreground mb-6">
              In a real application, you would upload your document photos here. For this demo, documents are auto-approved.
            </p>
            <Button onClick={() => handleStep("document_type", formData, "selfie")} disabled={isSubmitting} className="w-full gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === "selfie" && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Selfie check</h1>
            <p className="text-muted-foreground mb-8">We need to verify your identity matches your documents</p>
            <div className="border-2 border-dashed rounded-xl p-10 text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">Camera capture</p>
              <p className="text-sm text-muted-foreground">In a real app, your camera would open here. This step is auto-approved in demo mode.</p>
            </div>
            <Button onClick={() => handleStep("selfie_check", { selfie: "auto_approved" }, "funding")} disabled={isSubmitting} className="w-full gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === "funding" && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Source of funds</h1>
            <p className="text-muted-foreground mb-8">We are required to understand where your funds come from</p>
            <div className="space-y-4 mb-8">
              <div>
                <Label>Primary source of funds</Label>
                <Select value={(formData.source as string) ?? ""} onValueChange={v => setFormData(p => ({...p, source: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {["Employment / Salary", "Business Income", "Investments", "Savings", "Inheritance", "Other"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated monthly income</Label>
                <Select value={(formData.monthly_income_range as string) ?? ""} onValueChange={v => setFormData(p => ({...p, monthly_income_range: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>
                    {["< $1,000", "$1,000 – $5,000", "$5,000 – $15,000", "$15,000 – $50,000", "> $50,000"].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => handleStep("funding_source", formData, "terms")} disabled={isSubmitting || !formData.source} className="w-full gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === "terms" && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Terms & conditions</h1>
            <p className="text-muted-foreground mb-8">Please review and accept our terms to complete your application</p>
            <div className="space-y-4 mb-8">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={formData.terms_accepted as boolean ?? false} onCheckedChange={v => setFormData(p => ({...p, terms_accepted: !!v}))} className="mt-0.5" />
                <span className="text-sm">I agree to the Terms & Conditions and Account Agreement</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={formData.privacy_accepted as boolean ?? false} onCheckedChange={v => setFormData(p => ({...p, privacy_accepted: !!v}))} className="mt-0.5" />
                <span className="text-sm">I have read and understood the Privacy Policy</span>
              </label>
            </div>
            <Button
              onClick={() => handleStep("terms_acceptance", formData)}
              disabled={isSubmitting || !formData.terms_accepted || !formData.privacy_accepted}
              className="w-full gap-2"
            >
              {isSubmitting ? "Verifying..." : "Submit application"} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
