import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Image,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { verifyEmail, resendVerification, registerPushToken } from "../../api/client";
import { getExpoPushToken } from "../../api/pushNotifications";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../theme/theme";

const { colors } = THEME;
const HAIRLINE = "#ECECEC";
const INPUT_BG = "#F5F6F5";
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailScreen() {
  const { setUser } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleVerify() {
    if (!email) {
      setError("Missing email — please sign up again.");
      return;
    }
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { token, user } = await verifyEmail(email, code.trim());
      setUser(user, token);

      // Fire-and-forget: register push token in the background
      const registerTokenAsync = async () => {
        try {
          const pushToken = await getExpoPushToken();
          if (pushToken) {
            await registerPushToken(user.id, pushToken);
          }
        } catch (error) {
          console.error('Failed to register push token:', error);
        }
      };
      registerTokenAsync();

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
          console.warn("Unexpected or missing role on verify-email response:", user.role);
          router.replace("/(buyer)");
      }
    } catch (err: unknown) {
      console.error("Email verification failed:", err);
      const message = err instanceof Error ? err.message.replace(/^\d{3}:\s*/, "").trim() : "";
      setError(message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setResendMessage("");
    setError("");
    setResendLoading(true);
    try {
      await resendVerification(email);
      setResendMessage("Code sent — check your email.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      console.error("Resend verification failed:", err);
      const message = err instanceof Error ? err.message.replace(/^\d{3}:\s*/, "").trim() : "";
      setError(message || "Could not resend the code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Banner: crop photo background under a green overlay */}
      <ImageBackground
        source={require("../../../assets/images/auth-bg.jpeg")}
        style={styles.banner}
        imageStyle={styles.bannerImage}
        resizeMode="cover"
      >
        <View style={styles.bannerOverlay} />
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
        <Text style={styles.heading}>Check your email</Text>
        <Text style={styles.subheading}>
          We sent a 6-digit code to {email ?? "your email"}
        </Text>
      </ImageBackground>

      <View style={styles.body}>
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Verification code</Text>
            <View style={styles.inputRow}>
              <Ionicons name="key-outline" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.codeInput}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={(text) => setCode(text.replace(/[^0-9]/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          {/* Inline error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Inline resend confirmation */}
          {!!resendMessage && !error && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={styles.successText}>{resendMessage}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Verify</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <TouchableOpacity
            style={styles.linkRow}
            onPress={handleResend}
            disabled={resendLoading || cooldown > 0}
          >
            {resendLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.linkText}>
                Didn&apos;t get a code?{" "}
                <Text style={[styles.linkAction, cooldown > 0 && styles.linkActionDisabled]}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </Text>
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },

  // Banner: crop photo + green overlay
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 34,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  bannerImage: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    opacity: 0.78,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 26 },
  brandMark: {
    width: 64,
    height: 64,
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
  inputIcon: { flexShrink: 0 },
  codeInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    paddingVertical: 0,
    letterSpacing: 8,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FDECEA",
    borderRadius: 12,
    padding: 12,
  },
  errorText: { fontSize: 13, color: colors.danger, flex: 1, fontWeight: "500" },

  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 12,
  },
  successText: { fontSize: 13, color: colors.success, flex: 1, fontWeight: "500" },

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
  linkActionDisabled: { color: colors.textMuted },
});
