import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Payment } from "@workspace/api-client-react";

interface PaymentRowProps {
  payment: Payment;
}

export function PaymentRow({ payment }: PaymentRowProps) {
  const colors = useColors();
  const status = payment.status;
  const isPending = status === "pending" || status === "processing";
  const isFailed = status === "failed" || status === "cancelled";

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: payment.currency,
    minimumFractionDigits: 2,
  }).format(payment.amount);

  const date = new Date(payment.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const label = payment.reference || `Transfer · ${payment.currency}`;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconBg, { backgroundColor: colors.primary + "22" }]}>
        <Feather name="send" size={18} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{date}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: isFailed ? colors.destructive : colors.foreground }]}>
          -{formattedAmount}
        </Text>
        {isPending && (
          <Text style={[styles.pending, { color: colors.mutedForeground }]}>Pending</Text>
        )}
        {isFailed && (
          <Text style={[styles.pending, { color: colors.destructive }]}>
            {status === "cancelled" ? "Cancelled" : "Failed"}
          </Text>
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
