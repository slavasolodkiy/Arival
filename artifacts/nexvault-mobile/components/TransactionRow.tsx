import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<string, { icon: string; bg: string }> = {
  transfer: { icon: "send", bg: "#0AB3A0" },
  card: { icon: "credit-card", bg: "#6366F1" },
  fee: { icon: "minus-circle", bg: "#F59E0B" },
  fx: { icon: "refresh-cw", bg: "#8B5CF6" },
  interest: { icon: "trending-up", bg: "#22C55E" },
};

interface Transaction {
  id: string;
  type: "credit" | "debit";
  category?: string;
  amount: number;
  currency: string;
  description: string;
  counterparty?: { name?: string };
  status: string;
  createdAt: string;
}

interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const colors = useColors();
  const isCredit = transaction.type === "credit";
  const cat = CATEGORY_ICONS[transaction.category ?? "transfer"] ?? CATEGORY_ICONS.transfer;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: transaction.currency,
    minimumFractionDigits: 2,
  }).format(transaction.amount);

  const date = new Date(transaction.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const counterpartyName =
    transaction.counterparty?.name || transaction.description.split(" ").slice(0, 3).join(" ");

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconBg, { backgroundColor: cat.bg + "22" }]}>
        <Feather name={cat.icon as any} size={18} color={cat.bg} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {counterpartyName}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{date}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amount,
            { color: isCredit ? colors.positive : colors.foreground },
          ]}
        >
          {isCredit ? "+" : "-"}
          {formattedAmount}
        </Text>
        {transaction.status === "pending" && (
          <Text style={[styles.pending, { color: colors.mutedForeground }]}>Pending</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
  date: {
    fontSize: 12,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  pending: {
    fontSize: 11,
    marginTop: 2,
  },
});
