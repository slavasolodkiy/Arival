import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  useStartOnboarding,
  useSubmitOnboardingStep,
  useGetOnboardingStatus,
} from "@workspace/api-client-react";

type FlowStep = {
  id: string;
  title: string;
  type: string;
  fields?: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
};

type FlowConfig = {
  steps: FlowStep[];
};

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateUser } = useAuth();

  const [applicationId, setApplicationId] = useState<string>("");
  const [currentStepId, setCurrentStepId] = useState<string>("");
  const [flowConfig, setFlowConfig] = useState<FlowConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [selectedFlowType, setSelectedFlowType] = useState<"individual" | "business">("individual");

  const startMutation = useStartOnboarding();
  const submitMutation = useSubmitOnboardingStep();

  const { data: onboardingStatus } = useGetOnboardingStatus();

  useEffect(() => {
    if (onboardingStatus?.applicationId && onboardingStatus.applicationId !== "") {
      if (onboardingStatus.status === "approved") {
        updateUser({ kycStatus: "approved" });
        setIsDone(true);
      } else if (onboardingStatus.status === "in_progress") {
        setIsStarted(true);
        setApplicationId(onboardingStatus.applicationId);
        setCurrentStepId(onboardingStatus.currentStep);
      }
    }
  }, [onboardingStatus]);

  const currentStep = flowConfig?.steps.find(s => s.id === currentStepId);

  const handleStart = () => {
    setError("");
    startMutation.mutate(
      { data: { flowType: selectedFlowType, countryCode: "GB" } },
      {
        onSuccess: (data) => {
          setApplicationId(data.applicationId);
          setCurrentStepId(data.currentStep);
          setFlowConfig(data.flowConfig as unknown as FlowConfig);
          setIsStarted(true);
          if (data.status === "approved") {
            setIsDone(true);
            updateUser({ kycStatus: "approved" });
          }
        },
        onError: (err: any) => {
          setError(err?.message || "Failed to start onboarding.");
        },
      }
    );
  };

  const handleSubmitStep = () => {
    setError("");
    if (!currentStepId || !applicationId) return;

    submitMutation.mutate(
      {
        data: {
          applicationId,
          stepId: currentStepId,
          data: formData,
        },
      },
      {
        onSuccess: (data) => {
          setFormData({});
          if (data.status === "approved") {
            setIsDone(true);
            updateUser({ kycStatus: "approved" });
          } else {
            if (data.flowConfig) {
              setFlowConfig(data.flowConfig as unknown as FlowConfig);
            }
            setCurrentStepId(data.nextStep);
          }
        },
        onError: (err: any) => {
          setError(err?.message || "Failed to submit step.");
        },
      }
    );
  };

  const totalSteps = flowConfig?.steps.length ?? 0;
  const currentStepIndex = flowConfig?.steps.findIndex(s => s.id === currentStepId) ?? 0;
  const progress = totalSteps > 0 ? (currentStepIndex / totalSteps) : 0;

  if (isDone) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.successIcon, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="check-circle" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Account Verified!</Text>
          <Text style={[styles.successText, { color: colors.mutedForeground }]}>
            Your identity has been verified. Redirecting to your account…
          </Text>
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  if (!isStarted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingHorizontal: 24, paddingTop: insets.top }]}>
        <View style={[styles.logo, { backgroundColor: colors.primary + "22" }]}>
          <Text style={[styles.logoText, { color: colors.primary }]}>N</Text>
        </View>
        <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>Verify your identity</Text>
        <Text style={[styles.welcomeText, { color: colors.mutedForeground }]}>
          Complete a short KYC process to access all features of your Nexvault account.
        </Text>

        <Text style={[styles.flowLabel, { color: colors.mutedForeground }]}>Account type</Text>
        <View style={styles.flowRow}>
          {(["individual", "business"] as const).map((type) => (
            <Pressable
              key={type}
              onPress={() => setSelectedFlowType(type)}
              style={[
                styles.flowChip,
                {
                  backgroundColor: selectedFlowType === type ? colors.primary : colors.secondary,
                  borderColor: selectedFlowType === type ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather
                name={type === "individual" ? "user" : "briefcase"}
                size={16}
                color={selectedFlowType === type ? colors.primaryForeground : colors.foreground}
              />
              <Text style={[styles.flowChipText, { color: selectedFlowType === type ? colors.primaryForeground : colors.foreground }]}>
                {type === "individual" ? "Personal" : "Business"}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, marginTop: 24 }]}
          onPress={handleStart}
          disabled={startMutation.isPending}
        >
          {startMutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Start verification</Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
        <Text style={[styles.stepCounter, { color: colors.mutedForeground }]}>
          Step {currentStepIndex + 1} of {totalSteps}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>
          {currentStep?.title ?? currentStepId}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.formContainer, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "22" }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorInline, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {currentStep?.fields?.map((field) => {
          if (field.type === "radio" || field.type === "select") {
            return (
              <View key={field.id} style={{ marginBottom: 16 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                <View style={{ gap: 8 }}>
                  {field.options?.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setFormData(d => ({ ...d, [field.id]: opt.value }))}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: formData[field.id] === opt.value ? colors.primary + "22" : colors.secondary,
                          borderColor: formData[field.id] === opt.value ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.optionText, { color: formData[field.id] === opt.value ? colors.primary : colors.foreground }]}>
                        {opt.label}
                      </Text>
                      {formData[field.id] === opt.value && (
                        <Feather name="check" size={16} color={colors.primary} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          }

          if (field.type === "checkbox") {
            return (
              <Pressable
                key={field.id}
                onPress={() => setFormData(d => ({ ...d, [field.id]: d[field.id] === "true" ? "false" : "true" }))}
                style={[styles.checkboxRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}
              >
                <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: formData[field.id] === "true" ? colors.primary : "transparent" }]}>
                  {formData[field.id] === "true" && <Feather name="check" size={12} color={colors.primaryForeground} />}
                </View>
                <Text style={[styles.checkboxText, { color: colors.foreground }]}>{field.label}</Text>
              </Pressable>
            );
          }

          return (
            <View key={field.id} style={{ marginBottom: 16 }}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                value={formData[field.id] ?? ""}
                onChangeText={(text) => setFormData(d => ({ ...d, [field.id]: text }))}
                placeholder={field.label}
                placeholderTextColor={colors.mutedForeground}
                keyboardType={field.type === "date" ? "numbers-and-punctuation" : "default"}
                autoCapitalize={field.type === "text" ? "words" : "none"}
              />
            </View>
          );
        })}

        <Pressable
          style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, marginTop: 24 }]}
          onPress={handleSubmitStep}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Continue</Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  logoText: { fontSize: 32, fontWeight: "800" as const },
  welcomeTitle: { fontSize: 26, fontWeight: "700" as const, textAlign: "center", marginBottom: 10 },
  welcomeText: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  flowLabel: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 10 },
  flowRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  flowChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  flowChipText: { fontSize: 15, fontWeight: "600" as const },
  successCard: { padding: 32, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 12, margin: 24 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  successTitle: { fontSize: 24, fontWeight: "700" as const },
  successText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  header: { paddingHorizontal: 24, paddingBottom: 16, gap: 8 },
  stepCounter: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase" as const },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" as const },
  progressFill: { height: 4, borderRadius: 2 },
  stepTitle: { fontSize: 22, fontWeight: "700" as const, marginTop: 4 },
  formContainer: { paddingHorizontal: 24, paddingTop: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 8 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  optionChip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 12, borderWidth: 1 },
  optionText: { fontSize: 15, fontWeight: "500" as const },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkboxText: { fontSize: 14, flex: 1 },
  button: { height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  buttonText: { fontSize: 16, fontWeight: "600" as const },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, marginBottom: 12 },
  errorInline: { fontSize: 13, flex: 1 },
  errorText: { fontSize: 13, marginTop: 8 },
});
