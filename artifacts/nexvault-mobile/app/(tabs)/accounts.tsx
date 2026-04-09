import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Skeleton } from "@/components/Skeleton";
import { useGetAccounts } from "@workspace/api-client-react";

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", SGD: "🇸🇬", AED: "🇦🇪",
};

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: accounts, isLoading, refetch, isRefetching } = useGetAccounts();

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Accounts</Text>

      {isLoading ? (
        <View style={{ gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={110} borderRadius={16} />
          ))}
        </View>
      ) : !accounts?.length ? (
        <View style={styles.emptyState}>
          <Feather name="credit-card" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No accounts yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Complete onboarding to activate your accounts.
          </Text>
        </View>
      ) : (
        accounts.map((acc) => {
          const balance = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: acc.currency,
            minimumFractionDigits: 2,
          }).format(acc.balance);

          const available = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: acc.currency,
            minimumFractionDigits: 2,
          }).format(acc.availableBalance);

          return (
            <View
              key={acc.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.flag}>{CURRENCY_FLAGS[acc.currency] ?? "💰"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.currency, { color: colors.foreground }]}>
                    {acc.currency} Account
                  </Text>
                  {acc.iban && (
                    <Text style={[styles.iban, { color: colors.mutedForeground }]}>
                      {acc.iban.slice(0, 4)} •••• •••• {acc.iban.slice(-4)}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        acc.status === "active"
                          ? colors.positive + "22"
                          : colors.negative + "22",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          acc.status === "active" ? colors.positive : colors.negative,
                      },
                    ]}
                  >
                    {acc.status}
                  </Text>
                </View>
              </View>

              <Text style={[styles.balance, { color: colors.foreground }]}>{balance}</Text>
              <Text style={[styles.available, { color: colors.mutedForeground }]}>
                Available: {available}
              </Text>
            </View>
          );
        })
      )}

      <View style={{ height: insets.bottom + (Platform.OS === "web" ? 34 : 80) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5, marginVertical: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 12,
    gap: 6,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  flag: { fontSize: 24 },
  currency: { fontSize: 15, fontWeight: "600" as const },
  iban: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "600" as const, textTransform: "capitalize" },
  balance: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
  available: { fontSize: 13 },
  emptyState: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600" as const },
  emptyText: { fontSize: 14, textAlign: "center" },
});
