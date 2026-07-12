import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { verifyPayment, verifyDeliveryPayment } from "../api/client";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  bgLight: "#F4F7F5",
};

export default function PaymentWebViewScreen() {
  const { authorizationUrl, reference, kind } = useLocalSearchParams<{
    authorizationUrl: string;
    reference: string;
    kind?: string;
  }>();
  const isDeliveryPayment = kind === "delivery";
  const [verifying, setVerifying] = useState(false);
  // Guards against verify firing twice (e.g. redirect detection + manual tap).
  const completedRef = useRef(false);

  const runVerify = async (triggeredManually: boolean) => {
    if (!reference || completedRef.current || verifying) return;
    setVerifying(true);
    try {
      const result = isDeliveryPayment
        ? await verifyDeliveryPayment(reference)
        : await verifyPayment(reference);
      if (result.status === "success") {
        completedRef.current = true;
        Alert.alert(
          "Payment successful",
          isDeliveryPayment
            ? "Your delivery fee has been paid."
            : "Your order has been marked as paid."
        );
        router.back();
      } else if (triggeredManually) {
        Alert.alert(
          "Payment not confirmed",
          `Status: ${result.status}. If you've just paid, wait a moment and tap the button again — or close and pay later.`
        );
      }
    } catch (err) {
      if (triggeredManually) {
        Alert.alert(
          "Verification failed",
          err instanceof Error ? err.message : "Something went wrong."
        );
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleNavigationStateChange = (navState: { url?: string }) => {
    const url = navState.url ?? "";
    // Paystack redirects after payment to a callback/close URL carrying the
    // transaction reference (e.g. ?trxref=...&reference=...) — auto-verify then.
    if (
      url.includes("trxref=") ||
      url.includes("reference=") ||
      url.includes("standard.paystack.co/close") ||
      url.includes("/callback")
    ) {
      runVerify(false);
    }
  };

  if (!authorizationUrl || !reference) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#9E9E9E" />
          <Text style={styles.errorText}>Missing payment details.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pay</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Close payment"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={THEME.deepGreen} />
        </TouchableOpacity>
      </View>

      <WebView
        source={{ uri: authorizationUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color={THEME.accent} />
          </View>
        )}
      />

      {/* Manual fallback in case the redirect detection doesn't fire */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.verifyBtn, verifying && styles.btnDisabled]}
          onPress={() => runVerify(true)}
          disabled={verifying}
          activeOpacity={0.85}
        >
          {verifying ? (
            <ActivityIndicator color={THEME.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color={THEME.white} />
              <Text style={styles.verifyBtnText}>I&apos;ve completed payment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: THEME.deepGreen },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: { fontSize: 15, color: "#757575" },
  backLink: { fontSize: 14, color: THEME.accent, fontWeight: "600" },

  webviewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.white,
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#E0E0E0",
    backgroundColor: THEME.white,
  },
  verifyBtn: {
    backgroundColor: THEME.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  verifyBtnText: { fontSize: 15, fontWeight: "700", color: THEME.white },
  btnDisabled: { opacity: 0.65 },
});
