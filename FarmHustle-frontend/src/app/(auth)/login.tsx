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

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  inputBorder: "#D0D9D4",
  placeholder: "#9EB3A9",
  errorRed: "#C62828",
  bgLight: "#F4F7F5",
};

export default function LoginScreen() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />

      <View style={styles.container}>
        {/* Logo / brand */}
        <View style={styles.brandRow}>
          <Ionicons name="leaf" size={28} color={THEME.accent} />
          <Text style={styles.brandText}>FarmHustle</Text>
        </View>

        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Log in to your account</Text>

        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={THEME.accent} style={styles.inputIcon} />
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
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={THEME.accent} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Your password"
                placeholderTextColor={THEME.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={THEME.placeholder} />
              </TouchableOpacity>
            </View>
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
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={THEME.white} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Log in</Text>
            )}
          </TouchableOpacity>

          {/* Link to signup */}
          <TouchableOpacity style={styles.linkRow} onPress={() => router.replace("/signup")}>
            <Text style={styles.linkText}>
              Don't have an account?{" "}
              <Text style={styles.linkAction}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 36 },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 36,
  },
  brandText: { fontSize: 22, fontWeight: "800", color: THEME.deepGreen },

  heading: { fontSize: 26, fontWeight: "800", color: THEME.deepGreen, marginBottom: 6 },
  subheading: { fontSize: 14, color: "#6B8C7E", marginBottom: 32 },

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
