import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import {
  FlatList,
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
import { useAuth } from "@/context/AuthContext";
import { AccountCard } from "@/components/AccountCard";
import { TransactionRow } from "@/components/TransactionRow";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useGetAccountsSummary } from "@workspace/api-client-react";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    data: summary,
    isLoading,
    refetch,
    isRefetching,
  } = useGetAccountsSummary();

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const firstName = user?.firstName || "there";

  const totalFormatted = summary
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(summary.totalBalanceUsd)
    : null;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (isLoading) return <DashboardSkeleton />;

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
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Good day, {firstName} 👋
          </Text>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total balance</Text>
          <Text style={[styles.totalBalance, { color: colors.foreground }]}>
            {totalFormatted ?? "—"}
          </Text>
        </View>
        <View style={[styles.avatarBox, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {firstName[0]?.toUpperCase() ?? "U"}
          </Text>
        </View>
      </View>

      {summary && summary.monthlyIncome > 0 && (
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.stat}>
            <Feather name="arrow-down-left" size={16} color={colors.positive} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Income</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(summary.monthlyIncome)}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Feather name="arrow-up-right" size={16} color={colors.negative} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Spent</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(summary.monthlySpend)}
            </Text>
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Accounts</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.accountsScroll}
      >
        {summary?.accounts.map((acc) => (
          <AccountCard
            key={acc.id}
            currency={acc.currency}
            balance={acc.balance}
            availableBalance={acc.availableBalance}
            iban={acc.iban}
            accountNumber={acc.accountNumber}
            status={acc.status}
          />
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          Recent activity
        </Text>
        {summary && summary.pendingTransactions && summary.pendingTransactions > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
              {summary.pendingTransactions} pending
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {!summary?.recentTransactions?.length ? (
          <View style={styles.emptyState}>
            <Feather name="activity" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No transactions yet
            </Text>
          </View>
        ) : (
          summary.recentTransactions.map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))
        )}
      </View>

      <View style={{ height: insets.bottom + (Platform.OS === "web" ? 34 : 80) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 20,
  },
  greeting: { fontSize: 14, marginBottom: 4 },
  totalLabel: { fontSize: 13, marginBottom: 2 },
  totalBalance: { fontSize: 40, fontWeight: "700" as const, letterSpacing: -1.5 },
  avatarBox: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginTop: 8 },
  avatarText: { fontSize: 18, fontWeight: "700" as const },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, marginHorizontal: 8 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 16, fontWeight: "600" as const },
  sectionTitle: { fontSize: 13, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 },
  accountsScroll: { paddingRight: 20, marginBottom: 28, paddingBottom: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600" as const },
  txCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, overflow: "hidden" },
  emptyState: { paddingVertical: 40, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14 },
});
