import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useGetMe } from "@workspace/api-client-react";

interface SettingRow {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingItem({ icon, label, value, onPress, danger }: SettingRow) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, opacity: pressed && onPress ? 0.7 : 1 },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: danger
              ? colors.destructive + "22"
              : colors.primary + "22",
          },
        ]}
      >
        <Feather
          name={icon as any}
          size={16}
          color={danger ? colors.destructive : colors.primary}
        />
      </View>
      <Text
        style={[
          styles.rowLabel,
          { color: danger ? colors.destructive : colors.foreground },
        ]}
      >
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
        ) : null}
        {onPress && !danger && (
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        )}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();
  const { data: me } = useGetMe();

  const profile = me ?? user;
  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    profile?.email?.split("@")[0] ||
    "User";

  const handleLogout = () => {
    if (Platform.OS === "web") {
      signOut();
      return;
    }
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          signOut();
        },
      },
    ]);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profile</Text>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {fullName[0]?.toUpperCase() ?? "U"}
          </Text>
        </View>
        <View>
          <Text style={[styles.name, { color: colors.foreground }]}>{fullName}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>
            {profile?.email ?? "—"}
          </Text>
        </View>
        <View
          style={[
            styles.kycBadge,
            {
              backgroundColor:
                (profile as any)?.kycStatus === "approved"
                  ? colors.positive + "22"
                  : colors.primary + "22",
            },
          ]}
        >
          <Text
            style={[
              styles.kycText,
              {
                color:
                  (profile as any)?.kycStatus === "approved"
                    ? colors.positive
                    : colors.primary,
              },
            ]}
          >
            {(profile as any)?.kycStatus === "approved" ? "✓ Verified" : "KYC Pending"}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingItem icon="user" label="Personal info" onPress={() => {}} />
        <SettingItem icon="shield" label="Security" onPress={() => {}} />
        <SettingItem icon="bell" label="Notifications" onPress={() => {}} />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Preferences</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingItem icon="globe" label="Language" value="English" />
        <SettingItem icon="dollar-sign" label="Base currency" value="USD" />
        <SettingItem icon="moon" label="Theme" value="Dark" />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Support</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingItem icon="help-circle" label="Help centre" onPress={() => {}} />
        <SettingItem icon="file-text" label="Terms & Privacy" onPress={() => {}} />
        <SettingItem icon="info" label="App version" value="1.0.0" />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingItem icon="log-out" label="Sign out" onPress={handleLogout} danger />
      </View>

      <View style={{ height: insets.bottom + (Platform.OS === "web" ? 34 : 80) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5, marginVertical: 20 },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontWeight: "700" as const },
  name: { fontSize: 17, fontWeight: "600" as const },
  email: { fontSize: 13, marginTop: 2 },
  kycBadge: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  kycText: { fontSize: 11, fontWeight: "600" as const },
  sectionLabel: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14 },
});
