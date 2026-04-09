import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
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
import { useAuth } from "@/context/AuthContext";
import { useRegister, useLogin } from "@workspace/api-client-react";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await signIn(data.accessToken, data.user as any);
      },
    },
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: () => {
        loginMutation.mutate({ data: { email, password } });
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err?.message || "Registration failed. Please try again.");
      },
    },
  });

  const handleRegister = () => {
    setError("");
    if (!email || !password || !firstName) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    registerMutation.mutate({
      data: { email, password, firstName, lastName, accountType: "individual" },
    });
  };

  const isPending = registerMutation.isPending || loginMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + 34,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Text style={[styles.logoLetter, { color: colors.primaryForeground }]}>N</Text>
          </View>
          <Text style={[styles.logoText, { color: colors.foreground }]}>Nexvault</Text>
        </View>

        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Start your banking journey
          </Text>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "22" }]}>
            <Feather name="alert-circle" size={15} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>First name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Jane"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Last name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Doe"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
            <View style={[styles.passwordWrapper, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.foreground }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          onPress={handleRegister}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Create account</Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 48 },
  logoBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoLetter: { fontSize: 18, fontWeight: "700" as const },
  logoText: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.5 },
  headerBlock: { marginBottom: 32, gap: 6 },
  title: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
  subtitle: { fontSize: 15 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { fontSize: 13, flex: 1 },
  form: { gap: 16, marginBottom: 24 },
  row: { flexDirection: "row", gap: 12 },
  label: { fontSize: 13, fontWeight: "500" as const, marginBottom: 8 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  passwordWrapper: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  passwordInput: { flex: 1, fontSize: 15 },
  button: { height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  buttonText: { fontSize: 16, fontWeight: "600" as const },
  footer: { flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: "600" as const },
});
