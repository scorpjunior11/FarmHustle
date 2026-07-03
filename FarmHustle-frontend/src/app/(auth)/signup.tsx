import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signup } from "../../api/client";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  inputBorder: "#D0D9D4",
  placeholder: "#9EB3A9",
  errorRed: "#C62828",
  bgLight: "#F4F7F5",
};

type Role = "FARMER" | "BUYER" | "TRANSPORT_PROVIDER";

const ROLE_OPTIONS: { label: string; value: Role; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Farmer", value: "FARMER", icon: "leaf-outline" },
  { label: "Buyer", value: "BUYER", icon: "cart-outline" },
  { label: "Transport", value: "TRANSPORT_PROVIDER", icon: "car-outline" },
];

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !city.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!role) {
      setError("Please select a role.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signup({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, role, city: city.trim() });
      Alert.alert("Account created!", "You can now log in.", [
        { text: "Log in", onPress: () => router.replace("/login") },
      ]);
    } catch (err: unknown) {
      console.error("Signup failed:", err);
      const message = err instanceof Error ? err.message.replace(/^\d{3}:\s*/, "").trim() : "";
      setError(message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Logo / brand */}
        <View style={styles.brandRow}>
          <Ionicons name="leaf" size={28} color={THEME.accent} />
          <Text style={styles.brandText}>FarmHustle</Text>
        </View>

        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.subheading}>Join the marketplace for farmers and buyers</Text>

        {/* Fields */}
        <View style={styles.form}>
          <Field label="Full name" icon="person-outline">
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={THEME.placeholder}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </Field>

          <Field label="Email" icon="mail-outline">
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={THEME.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>

          <Field label="Phone" icon="call-outline">
            <TextInput
              style={styles.input}
              placeholder="+234 800 000 0000"
              placeholderTextColor={THEME.placeholder}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </Field>

          <Field label="Password" icon="lock-closed-outline">
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="Min. 8 characters"
              placeholderTextColor={THEME.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={THEME.placeholder} />
            </TouchableOpacity>
          </Field>

          <Field label="City" icon="location-outline">
            <TextInput
              style={styles.input}
              placeholder="e.g. Accra, Lagos"
              placeholderTextColor={THEME.placeholder}
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
          </Field>

          {/* Role selector */}
          <Text style={styles.fieldLabel}>I am a</Text>
          <View style={styles.roleRow}>
            {ROLE_OPTIONS.map((opt) => {
              const selected = role === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.roleCard, selected && styles.roleCardSelected]}
                  onPress={() => setRole(opt.value)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={selected ? THEME.white : THEME.accent}
                  />
                  <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Inline error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={THEME.errorRed} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={THEME.white} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Create account</Text>
            )}
          </TouchableOpacity>

          {/* Link to login */}
          <TouchableOpacity style={styles.linkRow} onPress={() => router.replace("/login")}>
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.linkAction}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={18} color={THEME.accent} style={styles.inputIcon} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 36 },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 28,
  },
  brandText: { fontSize: 22, fontWeight: "800", color: THEME.deepGreen },

  heading: { fontSize: 26, fontWeight: "800", color: THEME.deepGreen, marginBottom: 6 },
  subheading: { fontSize: 14, color: "#6B8C7E", marginBottom: 28 },

  form: { gap: 16 },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: THEME.deepGreen },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: THEME.inputBorder,
    borderRadius: 12,
    backgroundColor: THEME.bgLight,
    paddingHorizontal: 12,
    paddingVertical: 13,
    gap: 8,
  },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontSize: 15, color: "#1A1A1A" },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: 2 },

  roleRow: { flexDirection: "row", gap: 10 },
  roleCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.inputBorder,
    backgroundColor: THEME.bgLight,
    gap: 6,
  },
  roleCardSelected: {
    backgroundColor: THEME.accent,
    borderColor: THEME.accent,
  },
  roleLabel: { fontSize: 13, fontWeight: "600", color: THEME.accent },
  roleLabelSelected: { color: THEME.white },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    padding: 10,
  },
  errorText: { fontSize: 13, color: THEME.errorRed, flex: 1 },

  submitBtn: {
    backgroundColor: THEME.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: THEME.white },

  linkRow: { alignItems: "center", marginTop: 8 },
  linkText: { fontSize: 14, color: "#6B8C7E" },
  linkAction: { color: THEME.accent, fontWeight: "700" },
});
