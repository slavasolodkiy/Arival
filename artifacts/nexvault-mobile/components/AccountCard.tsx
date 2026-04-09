import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  SGD: "🇸🇬",
  AED: "🇦🇪",
};

const CURRENCY_GRADIENTS: Record<string, [string, string]> = {
  USD: ["#0D47A1", "#1565C0"],
  EUR: ["#1A237E", "#283593"],
  GBP: ["#4A148C", "#6A1B9A"],
  SGD: ["#006064", "#00838F"],
  AED: ["#1B5E20", "#2E7D32"],
};

interface AccountCardProps {
  currency: string;
  balance: number;
  availableBalance: number;
  iban?: string;
  accountNumber?: string;
  status: string;
}

export function AccountCard({
  currency,
  balance,
  availableBalance,
  iban,
  accountNumber,
  status,
}: AccountCardProps) {
  const colors = useColors();
  const gradient = CURRENCY_GRADIENTS[currency] ?? ["#131E33", "#1E2D47"];

  const formattedBalance = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(balance);

  const maskedAccount = iban
    ? `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`
    : accountNumber
    ? `•••• ${accountNumber.slice(-4)}`
    : null;

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.flag}>{CURRENCY_FLAGS[currency] ?? "💰"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.currencyLabel}>{currency} Account</Text>
          {status === "frozen" && (
            <Text style={[styles.statusBadge, { color: "#60A5FA" }]}>● Frozen</Text>
          )}
        </View>
      </View>
      <Text style={styles.balance}>{formattedBalance}</Text>
      {maskedAccount && <Text style={styles.account}>{maskedAccount}</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    height: 130,
    borderRadius: 20,
    padding: 18,
    justifyContent: "space-between",
    marginRight: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flag: {
    fontSize: 20,
  },
  currencyLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.8)",
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: "500" as const,
    marginTop: 2,
  },
  balance: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  account: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
  },
});
