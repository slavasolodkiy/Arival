import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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
import { TransactionRow } from "@/components/TransactionRow";
import { Skeleton } from "@/components/Skeleton";
import {
  useGetAccounts,
  useGetBeneficiaries,
  useGetTransfers,
  useInitiateTransfer,
  useConfirmTransfer,
  useCreateBeneficiary,
} from "@workspace/api-client-react";

const CURRENCIES = ["USD", "EUR", "GBP"];

export default function PaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: accounts } = useGetAccounts();
  const { data: beneficiaries, refetch: refetchBeneficiaries } = useGetBeneficiaries();
  const { data: transfers, isLoading: txLoading, refetch: refetchTx } = useGetTransfers({ limit: 20 });

  const initiateMutation = useInitiateTransfer();
  const confirmMutation = useConfirmTransfer();
  const createBenMutation = useCreateBeneficiary();

  const [step, setStep] = useState<"form" | "new_beneficiary" | "otp" | "done">("form");
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");

  const [newBenName, setNewBenName] = useState("");
  const [newBenIban, setNewBenIban] = useState("");
  const [newBenCurrency, setNewBenCurrency] = useState("EUR");

  const selectedAccount = accounts?.find((a) => a.id === fromAccountId) ?? accounts?.[0];
  const selectedBen = beneficiaries?.find((b) => b.id === selectedBeneficiaryId);

  const handleAddBeneficiary = () => {
    setError("");
    if (!newBenName.trim() || !newBenIban.trim()) {
      setError("Name and IBAN are required.");
      return;
    }
    createBenMutation.mutate(
      { data: { name: newBenName.trim(), iban: newBenIban.trim(), currency: newBenCurrency } },
      {
        onSuccess: (ben) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          refetchBeneficiaries();
          setSelectedBeneficiaryId(ben.id);
          setNewBenName("");
          setNewBenIban("");
          setStep("form");
        },
        onError: (err: any) => {
          setError(err?.message || "Failed to add beneficiary.");
        },
      }
    );
  };

  const handleInitiate = () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (!selectedBen) { setError("Select a beneficiary."); return; }

    initiateMutation.mutate(
      {
        data: {
          fromAccountId: selectedAccount?.id ?? "",
          beneficiaryId: selectedBen.id,
          amount: amt,
          currency: selectedAccount?.currency ?? "USD",
          reference: "Nexvault Mobile Transfer",
        },
      },
      {
        onSuccess: (data) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setTransferRef((data as any).transferId ?? "TX");
          if ((data as any).requiresOtp) {
            setStep("otp");
          } else {
            setStep("done");
            refetchTx();
          }
        },
        onError: (err: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err?.message || "Transfer failed. Please try again.");
        },
      }
    );
  };

  const handleConfirmOtp = () => {
    setError("");
    confirmMutation.mutate(
      { data: { transferId: transferRef, otpCode } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStep("done");
          refetchTx();
        },
        onError: (err: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err?.message || "Invalid OTP. Try 123456 in demo mode.");
        },
      }
    );
  };

  const handleReset = () => {
    setStep("form");
    setAmount("");
    setOtpCode("");
    setTransferRef("");
    setError("");
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Send money</Text>

        {step === "done" ? (
          <View style={[styles.successCard, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
            <Feather name="check-circle" size={48} color={colors.primary} />
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Transfer sent!</Text>
            <Text style={[styles.successText, { color: colors.mutedForeground }]}>
              Your transfer has been submitted successfully.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, marginTop: 8 }]}
              onPress={handleReset}
            >
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Send another</Text>
            </Pressable>
          </View>

        ) : step === "otp" ? (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ alignItems: "center", gap: 8, marginBottom: 24 }}>
              <View style={[styles.otpIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="shield" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Verify transfer</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Enter the OTP sent to your phone.{"\n"}Demo mode: use 123456
              </Text>
            </View>
            {error ? <Text style={[styles.errorInline, { color: colors.destructive }]}>{error}</Text> : null}
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground, textAlign: "center", letterSpacing: 8, fontSize: 24 }]}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="······"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, marginTop: 16 }]}
              onPress={handleConfirmOtp}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Confirm transfer</Text>
              )}
            </Pressable>
            <Pressable onPress={handleReset} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>

        ) : step === "new_beneficiary" ? (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Add recipient</Text>
              <Pressable onPress={() => { setStep("form"); setError(""); }}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {error ? <Text style={[styles.errorInline, { color: colors.destructive }]}>{error}</Text> : null}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={newBenName}
              onChangeText={setNewBenName}
              placeholder="John Smith"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>IBAN</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={newBenIban}
              onChangeText={setNewBenIban}
              placeholder="GB29 NWBK 6016 1331 9268 19"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Currency</Text>
            <View style={styles.currencyRow}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewBenCurrency(c)}
                  style={[
                    styles.currencyChip,
                    {
                      backgroundColor: newBenCurrency === c ? colors.primary : colors.secondary,
                      borderColor: newBenCurrency === c ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.currencyChipText, { color: newBenCurrency === c ? colors.primaryForeground : colors.foreground }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, marginTop: 8 }]}
              onPress={handleAddBeneficiary}
              disabled={createBenMutation.isPending}
            >
              {createBenMutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Add recipient</Text>
              )}
            </Pressable>
          </View>

        ) : (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "22" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>From</Text>
            <View style={[styles.accountPicker, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={styles.flag}>{selectedAccount?.currency === "USD" ? "🇺🇸" : selectedAccount?.currency === "EUR" ? "🇪🇺" : selectedAccount?.currency === "GBP" ? "🇬🇧" : "💰"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accountName, { color: colors.foreground }]}>{selectedAccount?.currency ?? "—"} Account</Text>
                <Text style={[styles.accountBal, { color: colors.mutedForeground }]}>
                  {selectedAccount
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: selectedAccount.currency }).format(selectedAccount.balance)
                    : "—"}
                </Text>
              </View>
            </View>

            <View style={styles.recipientHeader}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>To</Text>
              <Pressable onPress={() => { setStep("new_beneficiary"); setError(""); }}>
                <Text style={[styles.addNew, { color: colors.primary }]}>+ Add recipient</Text>
              </Pressable>
            </View>

            {!beneficiaries?.length ? (
              <View style={[styles.emptyBen, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="user-plus" size={20} color={colors.mutedForeground} />
                <Text style={[styles.emptyBenText, { color: colors.mutedForeground }]}>
                  No recipients yet. Add one above.
                </Text>
              </View>
            ) : (
              <View style={styles.beneficiaryList}>
                {beneficiaries.map((ben) => (
                  <Pressable
                    key={ben.id}
                    onPress={() => setSelectedBeneficiaryId(ben.id)}
                    style={[
                      styles.benItem,
                      {
                        backgroundColor: selectedBeneficiaryId === ben.id ? colors.primary + "22" : colors.secondary,
                        borderColor: selectedBeneficiaryId === ben.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.benAvatar, { backgroundColor: colors.primary + "33" }]}>
                      <Text style={[styles.benInitial, { color: colors.primary }]}>{ben.name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.benName, { color: colors.foreground }]}>{ben.name}</Text>
                      <Text style={[styles.benIban, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {ben.iban ? `${ben.iban.slice(0, 4)} •••• ${ben.iban.slice(-4)}` : ben.accountNumber ?? ""}
                      </Text>
                    </View>
                    <Text style={[styles.benCurrency, { color: colors.mutedForeground }]}>{ben.currency}</Text>
                    {selectedBeneficiaryId === ben.id && (
                      <Feather name="check-circle" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount</Text>
            <View style={[styles.amountRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.currencyCode, { color: colors.mutedForeground }]}>{selectedAccount?.currency ?? "USD"}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.foreground }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, marginTop: 8 }]}
              onPress={handleInitiate}
              disabled={initiateMutation.isPending || !selectedBen}
            >
              {initiateMutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="send" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Send money</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Recent transfers</Text>
        <View style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {txLoading ? (
            <View style={{ gap: 12, padding: 16 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} height={44} />)}
            </View>
          ) : !transfers?.items?.length ? (
            <View style={styles.emptyState}>
              <Feather name="send" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transfers yet</Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16 }}>
              {transfers.items.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: insets.bottom + (Platform.OS === "web" ? 34 : 80) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5, marginVertical: 20 },
  formCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 8, marginBottom: 28 },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 4 },
  recipientHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  addNew: { fontSize: 13, fontWeight: "600" as const },
  accountPicker: { height: 56, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  flag: { fontSize: 20 },
  accountName: { fontSize: 14, fontWeight: "600" as const },
  accountBal: { fontSize: 12, marginTop: 1 },
  beneficiaryList: { gap: 8 },
  benItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  benAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  benInitial: { fontSize: 15, fontWeight: "700" as const },
  benName: { fontSize: 14, fontWeight: "600" as const },
  benIban: { fontSize: 11, marginTop: 2 },
  benCurrency: { fontSize: 12, fontWeight: "500" as const },
  emptyBen: { borderRadius: 12, borderWidth: 1, padding: 20, flexDirection: "row", alignItems: "center", gap: 10 },
  emptyBenText: { fontSize: 13 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  amountRow: { height: 56, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  currencyCode: { fontSize: 14, fontWeight: "600" as const, minWidth: 40 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: "700" as const },
  currencyRow: { flexDirection: "row", gap: 8 },
  currencyChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  currencyChipText: { fontSize: 14, fontWeight: "600" as const },
  button: { height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  buttonText: { fontSize: 16, fontWeight: "600" as const },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  errorText: { fontSize: 13, flex: 1 },
  errorInline: { fontSize: 13, marginBottom: 8 },
  successCard: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: "center", gap: 12, marginBottom: 28 },
  successTitle: { fontSize: 22, fontWeight: "700" as const },
  successText: { fontSize: 14, textAlign: "center" },
  otpIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 20, fontWeight: "700" as const },
  stepSub: { fontSize: 13, textAlign: "center" },
  cancelText: { fontSize: 14 },
  sectionTitle: { fontSize: 13, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 },
  txCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  emptyState: { paddingVertical: 32, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14 },
});
