import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { login } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../theme/theme";

const { colors } = THEME;
const HAIRLINE = "#ECECEC";
const INPUT_BG = "#F5F6F5";

export default function LoginScreen() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const user = await login({ email: email.trim(), password });
      setUser(user);
      switch (user.role) {
        case "FARMER":
          router.replace("/(farmer)");
          break;
        case "BUYER":
          router.replace("/(buyer)");
          break;
        case "TRANSPORT_PROVIDER":
          router.replace("/(transport)");
          break;
        default:
          console.warn("Unexpected or missing role on login response:", user.role);
          router.replace("/(buyer)");
      }
    } catch (err: unknown) {
      console.error("Login failed:", err);
      const message = err instanceof Error ? err.message.replace(/^\d{3}:\s*/, "").trim() : "";
      setError(message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Green banner with brand + welcome */}
      <View style={styles.banner}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="leaf" size={18} color={colors.accent} />
          </View>
          <Text style={styles.wordmark}>
            Farm<Text style={styles.wordmarkAccent}>Hustle</Text>
          </Text>
        </View>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Log in to your account</Text>
      </View>

      {/* White form area */}
      <View style={styles.body}>
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.inputRow, focusedField === "email" && styles.inputRowFocused]}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} style={styles.inputIcon} />
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
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[styles.inputRow, focusedField === "password" && styles.inputRowFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Your password"
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
            </View>
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
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Log in</Text>
            )}
          </TouchableOpacity>

          {/* Link to signup */}
          <TouchableOpacity style={styles.linkRow} onPress={() => router.replace("/signup")}>
            <Text style={styles.linkText}>
              Don&apos;t have an account?{" "}
              <Text style={styles.linkAction}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },

  // Green banner
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 34,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 26 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  wordmark: { fontSize: 20, fontWeight: "800", color: colors.white, letterSpacing: 0.2 },
  wordmarkAccent: { color: colors.accent },
  heading: { fontSize: 26, fontWeight: "800", color: colors.white },
  subheading: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 4 },

  // White body
  body: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingTop: 28 },
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
