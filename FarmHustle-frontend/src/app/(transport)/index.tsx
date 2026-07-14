import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getDeliveries, acceptDelivery, Delivery } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  bgLight: "#F4F7F5",
};

export default function DeliveryJobsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [acceptingDelivery, setAcceptingDelivery] = useState<Delivery | null>(null);
  const [feeInput, setFeeInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await getDeliveries();
      setDeliveries(data);
    } catch {
      // silently fail — list stays as-is
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const openAcceptModal = (delivery: Delivery) => {
    setAcceptingDelivery(delivery);
    setFeeInput("");
    setFormError(null);
  };

  const closeAcceptModal = () => {
    if (!submitting) setAcceptingDelivery(null);
  };

  const handleConfirmAccept = async () => {
    if (!acceptingDelivery || !user) return;
    const fee = Number(feeInput);
    if (!feeInput.trim() || isNaN(fee) || fee <= 0) {
      setFormError("Please enter a valid fee greater than 0.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const commission = fee * 0.1;
      await acceptDelivery(acceptingDelivery.id, user.id, fee, commission);
      setDeliveries((prev) => prev.filter((d) => d.id !== acceptingDelivery.id));
      setAcceptingDelivery(null);
      Alert.alert("Job accepted", "This delivery has been added to your jobs.");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      setFormError(raw.replace(/^\d{3}:\s*/, ""));
    } finally {
      setSubmitting(false);
    }
  };

  const openJobs = deliveries.filter((d) => d.status === "REQUESTED");

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Available Jobs</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="log-in-outline" size={40} color="#9E9E9E" />
          <Text style={styles.emptyText}>Please log in to see available jobs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Jobs</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.accent} />
        </View>
      ) : (
        <FlatList
          data={openJobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 68 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[THEME.accent]}
              tintColor={THEME.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="cube-outline" size={40} color="#9E9E9E" />
              <Text style={styles.emptyText}>No available jobs right now.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <JobCard delivery={item} onAccept={() => openAcceptModal(item)} />
          )}
        />
      )}

      {/* Accept & Set Fee Modal */}
      <Modal
        visible={acceptingDelivery !== null}
        animationType="fade"
        transparent
        onRequestClose={closeAcceptModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set your delivery fee</Text>
            <Text style={styles.modalSubtitle}>
              {acceptingDelivery?.pickupLocation ?? "?"} →{" "}
              {acceptingDelivery?.deliveryLocation ?? "?"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Fee (GHS)"
              placeholderTextColor="#9E9E9E"
              keyboardType="numeric"
              value={feeInput}
              onChangeText={setFeeInput}
              accessibilityLabel="Delivery fee"
              autoFocus
            />
            <Text style={styles.helperText}>
              Platform commission (10%) is deducted from this fee.
            </Text>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeAcceptModal}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submitting && styles.btnDisabled]}
                onPress={handleConfirmAccept}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color={THEME.white} size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function JobCard({
  delivery,
  onAccept,
}: {
  delivery: Delivery;
  onAccept: () => void;
}) {
  const order = delivery.order;

  return (
    <View style={styles.card}>
      <View style={styles.routeRow}>
        <Text style={styles.routeText} numberOfLines={1}>
          {delivery.pickupLocation ?? "Unknown"}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={THEME.accent} style={styles.routeArrow} />
        <Text style={styles.routeText} numberOfLines={1}>
          {delivery.deliveryLocation ?? "Unknown"}
        </Text>
      </View>

      {order ? (
        <Text style={styles.detailText}>
          {order.product?.name ?? "Unknown product"} · {order.quantity}{" "}
          {order.product?.unit ?? ""} for {order.buyer?.name ?? "Unknown buyer"}
        </Text>
      ) : (
        <Text style={styles.detailText}>Standalone delivery</Text>
      )}

      <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
        <Ionicons name="checkmark-circle-outline" size={16} color={THEME.white} />
        <Text style={styles.acceptBtnText}>Accept &amp; set fee</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.deepGreen },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingTop: 60,
  },
  emptyText: { fontSize: 14, color: "#757575", textAlign: "center", paddingHorizontal: 32 },

  listContent: { padding: 16, flexGrow: 1 },

  card: {
    backgroundColor: THEME.bgLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeText: { flex: 1, fontSize: 14, fontWeight: "700", color: THEME.deepGreen },
  routeArrow: { flexShrink: 0 },

  detailText: { fontSize: 13, color: "#616161", marginTop: 8 },

  acceptBtn: {
    marginTop: 12,
    backgroundColor: THEME.accent,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  acceptBtnText: { fontSize: 13, fontWeight: "700", color: THEME.white },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: THEME.deepGreen },
  modalSubtitle: { fontSize: 13, color: "#757575", marginTop: 6, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#212121",
    backgroundColor: THEME.white,
  },
  helperText: { fontSize: 11, color: "#9E9E9E", marginTop: 6 },
  errorText: { fontSize: 13, color: "#D32F2F", marginTop: 10 },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: THEME.deepGreen },
  confirmBtn: {
    flex: 1,
    backgroundColor: THEME.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: THEME.white },
  btnDisabled: { opacity: 0.65 },
});
