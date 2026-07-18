import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signup } from "../../api/client";
import { THEME } from "../../theme/theme";

const { colors } = THEME;
const HAIRLINE = "#ECECEC";
const INPUT_BG = "#F5F6F5";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0\d{9}$/;

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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !city.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Please enter a valid email");
      return;
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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
      router.replace({ pathname: "/verify-email", params: { email: email.trim() } });
    } catch (err: unknown) {
      console.error("Signup failed:", err);
      const message = err instanceof Error ? err.message.replace(/^\d{3}:\s*/, "").trim() : "";
      setError(message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Green banner */}
      <View style={styles.banner}>
        <View style={styles.brandRow}>
          <Image
            source={require("../../../assets/images/farmhustle-mark.png")}
            style={styles.brandMark}
            resizeMode="contain"
          />
          <Text style={styles.wordmark}>
            Farm<Text style={styles.wordmarkAccent}>Hustle</Text>
          </Text>
        </View>
        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.subheading}>Join the marketplace for farmers and buyers</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <Field label="Full name" icon="person-outline" focused={focusedField === "name"}>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
            />
          </Field>

          <Field label="Email" icon="mail-outline" focused={focusedField === "email"}>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
          </Field>

          <Field label="Phone" icon="call-outline" focused={focusedField === "phone"}>
            <TextInput
              style={styles.input}
              placeholder="0241234567"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              onFocus={() => setFocusedField("phone")}
              onBlur={() => setFocusedField(null)}
            />
          </Field>

          <Field label="Password" icon="lock-closed-outline" focused={focusedField === "password"}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </Field>

          <Field label="City" icon="location-outline" focused={focusedField === "city"}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Accra, Lagos"
              placeholderTextColor={colors.textMuted}
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
              onFocus={() => setFocusedField("city")}
              onBlur={() => setFocusedField(null)}
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
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={selected ? colors.white : colors.primary}
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
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
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
              <ActivityIndicator color={colors.white} size="small" />
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
  focused,
  children,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  focused?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <Ionicons name={icon} size={18} color={colors.primary} style={styles.inputIcon} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },

  // Green banner
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  brandMark: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  wordmark: { fontSize: 20, fontWeight: "800", color: colors.white, letterSpacing: 0.2 },
  wordmarkAccent: { color: colors.accent },
  heading: { fontSize: 25, fontWeight: "800", color: colors.white },
  subheading: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },

  // White body
  body: { flex: 1, backgroundColor: colors.bg },
  bodyContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  form: { gap: 16 },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.text },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: HAIRLINE,
    borderRadius: 14,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  inputRowFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: 2 },

  roleRow: { flexDirection: "row", gap: 10 },
  roleCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: HAIRLINE,
    backgroundColor: INPUT_BG,
    gap: 6,
  },
  roleCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleLabel: { fontSize: 13, fontWeight: "700", color: colors.text },
  roleLabelSelected: { color: colors.white },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FDECEA",
    borderRadius: 12,
    padding: 12,
  },
  errorText: { fontSize: 13, color: colors.danger, flex: 1, fontWeight: "500" },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },

  linkRow: { alignItems: "center", marginTop: 10 },
  linkText: { fontSize: 14, color: colors.textMuted },
  linkAction: { color: colors.primary, fontWeight: "800" },
});
