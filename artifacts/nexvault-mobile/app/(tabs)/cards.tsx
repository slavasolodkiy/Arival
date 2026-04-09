import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
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
import {
  useFreezeCard,
  useGetCards,
  useUnfreezeCard,
} from "@workspace/api-client-react";

export default function CardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: cards, isLoading, refetch, isRefetching } = useGetCards();

  const freezeMutation = useFreezeCard();
  const unfreezeMutation = useUnfreezeCard();

  const handleToggleFreeze = useCallback(
    async (cardId: string, status: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (status === "frozen") {
        await unfreezeMutation.mutateAsync({ id: cardId });
      } else {
        await freezeMutation.mutateAsync({ id: cardId });
      }
      refetch();
    },
    [freezeMutation, unfreezeMutation, refetch]
  );

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            refetch();
          }}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Cards</Text>

      {isLoading ? (
        <View style={{ gap: 16 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} height={200} borderRadius={24} />
          ))}
        </View>
      ) : !cards?.length ? (
        <View style={styles.emptyState}>
          <Feather name="credit-card" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No cards yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Your cards will appear here after onboarding.
          </Text>
        </View>
      ) : (
        cards.map((card) => {
          const isFrozen = card.status === "frozen";
          const isVirtual = card.cardType === "virtual";
          const isProcessing =
            (freezeMutation.isPending || unfreezeMutation.isPending) &&
            (freezeMutation.variables?.id === card.id ||
              unfreezeMutation.variables?.id === card.id);

          return (
            <View key={card.id} style={styles.cardWrapper}>
              <LinearGradient
                colors={isFrozen ? ["#1A2640", "#1E2D47"] : ["#0D47A1", "#1565C0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, isFrozen && styles.cardFrozen]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: "rgba(255,255,255,0.15)" },
                    ]}
                  >
                    <Feather
                      name={isVirtual ? "smartphone" : "credit-card"}
                      size={12}
                      color="#fff"
                    />
                    <Text style={styles.typeBadgeText}>
                      {isVirtual ? "Virtual" : "Physical"}
                    </Text>
                  </View>
                  <Text style={styles.networkText}>VISA</Text>
                </View>

                <Text style={styles.cardNumber}>•••• •••• •••• {card.lastFour}</Text>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.cardLabel}>Expires</Text>
                    <Text style={styles.cardValue}>
                      {String(card.expiryMonth ?? "—").padStart(2, "0")}/
                      {String(card.expiryYear ?? "").slice(-2) ?? "—"}
                    </Text>
                  </View>
                  {isFrozen && (
                    <View style={styles.frozenBadge}>
                      <Feather name="lock" size={12} color="#60A5FA" />
                      <Text style={styles.frozenText}>Frozen</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>

              <View
                style={[
                  styles.actions,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => handleToggleFreeze(card.id, card.status)}
                  disabled={isProcessing || card.status === "cancelled" || card.status === "expired"}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Feather
                      name={isFrozen ? "unlock" : "lock"}
                      size={18}
                      color={isFrozen ? colors.positive : colors.primary}
                    />
                  )}
                  <Text
                    style={[
                      styles.actionText,
                      {
                        color: isFrozen ? colors.positive : colors.primary,
                      },
                    ]}
                  >
                    {isFrozen ? "Unfreeze" : "Freeze"}
                  </Text>
                </Pressable>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="eye" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                    Details
                  </Text>
                </Pressable>
              </View>
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
  cardWrapper: { marginBottom: 20 },
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    aspectRatio: 1.6,
    justifyContent: "space-between",
  },
  cardFrozen: { opacity: 0.7 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  typeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" as const },
  networkText: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "700" as const, letterSpacing: 2 },
  cardNumber: { color: "#fff", fontSize: 18, letterSpacing: 3, fontWeight: "600" as const },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  cardLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 0.5 },
  cardValue: { color: "#fff", fontSize: 14, fontWeight: "600" as const, marginTop: 2 },
  frozenBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(96,165,250,0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  frozenText: { color: "#60A5FA", fontSize: 12, fontWeight: "600" as const },
  actions: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 8,
  },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  actionText: { fontSize: 13, fontWeight: "600" as const },
  divider: { width: 1 },
  emptyState: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600" as const },
  emptyText: { fontSize: 14, textAlign: "center" },
});
