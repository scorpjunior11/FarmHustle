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
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getOrdersByBuyer,
  requestDelivery,
  getDeliveries,
  confirmDeliveryByBuyer,
  cancelDelivery,
  Order,
  OrderStatus,
  Delivery,
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  bgLight: "#F4F7F5",
};

const STATUS_META: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  PENDING: { label: "Pending", bg: "#F5F5F5", fg: "#757575" },
  NEGOTIATING: { label: "Negotiating", bg: "#F3E5F5", fg: "#6A1B9A" },
  AWAITING_PAYMENT: { label: "Awaiting payment", bg: "#FFF3E0", fg: "#E65100" },
  PAID: { label: "Paid", bg: "#E8F5E9", fg: "#2E7D32" },
  AWAITING_TRANSPORT: { label: "Awaiting transport", bg: "#FFF8E1", fg: "#F57F17" },
  IN_TRANSIT: { label: "In transit", bg: "#E3F2FD", fg: "#1565C0" },
  DELIVERED: { label: "Delivered", bg: "#E8F5E9", fg: "#2E7D32" },
  COMPLETED: { label: "Completed", bg: "#E0EDE4", fg: "#1B3A2B" },
  CANCELLED: { label: "Cancelled", bg: "#FCE4EC", fg: "#C62828" },
};

export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<string | null>(null);
  const [cancelingDeliveryId, setCancelingDeliveryId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [ordersData, deliveriesData] = await Promise.all([
        getOrdersByBuyer(user.id),
        getDeliveries(),
      ]);
      setOrders(ordersData);
      setDeliveries(deliveriesData);
    } catch {
      // silently fail — lists stay as-is
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleConfirmReceived = (delivery: Delivery) => {
    Alert.alert(
      "Confirm received",
      "Confirm you've received this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setConfirmingDeliveryId(delivery.id);
            try {
              const updated = await confirmDeliveryByBuyer(delivery.id);
              setDeliveries((prev) =>
                prev.map((d) => (d.id === delivery.id ? updated : d))
              );
              if (updated.status === "DELIVERED") {
                Alert.alert("Delivery confirmed", "Thanks for confirming!");
              }
            } catch (err) {
              Alert.alert(
                "Action failed",
                err instanceof Error ? err.message : "Something went wrong."
              );
            } finally {
              setConfirmingDeliveryId(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelDelivery = (delivery: Delivery) => {
    Alert.alert(
      "Cancel transport request",
      "Cancel this transport request?",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: async () => {
            setCancelingDeliveryId(delivery.id);
            try {
              await cancelDelivery(delivery.id);
              setDeliveries((prev) => prev.filter((d) => d.id !== delivery.id));
            } catch (err) {
              const raw = err instanceof Error ? err.message : "Something went wrong.";
              Alert.alert("Could not cancel", raw.replace(/^\d{3}:\s*/, ""));
            } finally {
              setCancelingDeliveryId(null);
            }
          },
        },
      ]
    );
  };

  // ── Request transport modal state ──────────────────────────
  const [transportOrder, setTransportOrder] = useState<Order | null>(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openTransportModal = (order: Order) => {
    setTransportOrder(order);
    setPickupLocation(order.farmer?.city ?? "");
    setDeliveryLocation(order.buyer?.city ?? "");
    setFormError(null);
  };

  const closeTransportModal = () => {
    if (!submitting) setTransportOrder(null);
  };

  const handleSubmitTransport = async () => {
    if (!transportOrder) return;
    if (!pickupLocation.trim() || !deliveryLocation.trim()) {
      setFormError("Please fill in both the pickup point and the destination.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await requestDelivery({
        orderId: transportOrder.id,
        pickupLocation: pickupLocation.trim(),
        deliveryLocation: deliveryLocation.trim(),
      });
      setTransportOrder(null);
      Alert.alert(
        "Transport requested",
        "A provider will accept it and set the fee."
      );
    } catch (err) {
      console.error(err);
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      setFormError(raw.replace(/^\d{3}:\s*/, ""));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="log-in-outline" size={40} color="#9E9E9E" />
          <Text style={styles.emptyText}>Please log in to see your orders.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.accent} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
              <Ionicons name="receipt-outline" size={40} color="#9E9E9E" />
              <Text style={styles.emptyText}>No orders yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const delivery = deliveries.find((d) => d.order?.id === item.id) ?? null;
            return (
              <OrderCard
                order={item}
                delivery={delivery}
                confirming={delivery !== null && confirmingDeliveryId === delivery.id}
                canceling={delivery !== null && cancelingDeliveryId === delivery.id}
                onRequestTransport={() => openTransportModal(item)}
                onConfirmReceived={() => delivery && handleConfirmReceived(delivery)}
                onCancelDelivery={() => delivery && handleCancelDelivery(delivery)}
              />
            );
          }}
        />
      )}

      {/* Request Transport Modal */}
      <Modal
        visible={transportOrder !== null}
        animationType="slide"
        onRequestClose={closeTransportModal}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Transport</Text>
            <TouchableOpacity
              onPress={closeTransportModal}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={THEME.deepGreen} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            {transportOrder ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryProduct}>
                  {transportOrder.product?.name ?? "Unknown product"}
                </Text>
                <Text style={styles.summaryMeta}>
                  {transportOrder.quantity} {transportOrder.product?.unit ?? ""}
                </Text>
                <Text style={styles.summaryMeta}>
                  from {transportOrder.farmer?.name ?? "Unknown farmer"}
                </Text>
              </View>
            ) : null}

            <Text style={styles.label}>Pickup point</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kumasi"
              placeholderTextColor="#9E9E9E"
              value={pickupLocation}
              onChangeText={setPickupLocation}
              accessibilityLabel="Pickup point"
            />
            <Text style={styles.helperText}>
              Pre-filled from the farmer&apos;s location — edit if needed
            </Text>

            <Text style={styles.label}>Destination</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Accra"
              placeholderTextColor="#9E9E9E"
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
              accessibilityLabel="Destination"
            />
            <Text style={styles.helperText}>
              Pre-filled from your location — edit if needed
            </Text>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
              onPress={handleSubmitTransport}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={THEME.white} size="small" />
              ) : (
                <>
                  <Ionicons name="car-outline" size={18} color={THEME.white} />
                  <Text style={styles.submitBtnText}>Post transport request</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={closeTransportModal}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const TRANSPORT_STATUS_META: Record<
  "REQUESTED" | "ACCEPTED" | "IN_TRANSIT" | "DELIVERED",
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  REQUESTED: { icon: "hourglass-outline", color: "#F57F17" },
  ACCEPTED: { icon: "checkmark-circle-outline", color: "#2E7D32" },
  IN_TRANSIT: { icon: "car-outline", color: "#1565C0" },
  DELIVERED: { icon: "checkmark-done-outline", color: "#2E7D32" },
};

function transportStatusLabel(delivery: Delivery): string {
  switch (delivery.status) {
    case "REQUESTED":
      return "Transport requested — finding a provider";
    case "ACCEPTED":
      return `Provider assigned — GHS ${delivery.deliveryFee ?? 0}`;
    case "IN_TRANSIT":
      return "On the way";
    case "DELIVERED":
      return "Delivered";
    default:
      return delivery.status;
  }
}

function OrderCard({
  order,
  delivery,
  confirming,
  canceling,
  onRequestTransport,
  onConfirmReceived,
  onCancelDelivery,
}: {
  order: Order;
  delivery: Delivery | null;
  confirming: boolean;
  canceling: boolean;
  onRequestTransport: () => void;
  onConfirmReceived: () => void;
  onCancelDelivery: () => void;
}) {
  const meta = STATUS_META[order.status];
  const price = order.agreedPrice ?? order.initialPrice;

  const canConfirmReceived =
    delivery !== null && delivery.status === "IN_TRANSIT" && !delivery.buyerConfirmed;
  const waitingForProvider =
    delivery !== null && delivery.status === "IN_TRANSIT" && delivery.buyerConfirmed;
  const transportMeta =
    delivery !== null && delivery.status in TRANSPORT_STATUS_META
      ? TRANSPORT_STATUS_META[delivery.status as keyof typeof TRANSPORT_STATUS_META]
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.productName} numberOfLines={1}>
          {order.product?.name ?? "Unknown product"}
        </Text>
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={styles.farmerText}>from {order.farmer?.name ?? "Unknown farmer"}</Text>

      <Text style={styles.metaText}>
        {order.quantity} {order.product?.unit ?? ""}
      </Text>

      <Text style={styles.priceText}>GHS {price}</Text>

      {order.status === "PAID" && !delivery ? (
        <TouchableOpacity
          style={styles.requestBtn}
          onPress={onRequestTransport}
          activeOpacity={0.85}
        >
          <Ionicons name="car-outline" size={16} color={THEME.white} />
          <Text style={styles.requestBtnText}>Request transport</Text>
        </TouchableOpacity>
      ) : null}

      {delivery && transportMeta ? (
        <View style={styles.transportRow}>
          <Ionicons name={transportMeta.icon} size={16} color={transportMeta.color} />
          <Text style={[styles.transportText, { color: transportMeta.color }]}>
            {transportStatusLabel(delivery)}
          </Text>
        </View>
      ) : null}

      {delivery && delivery.status === "REQUESTED" ? (
        <TouchableOpacity
          style={styles.cancelLink}
          onPress={onCancelDelivery}
          disabled={canceling}
          activeOpacity={0.7}
        >
          {canceling ? (
            <ActivityIndicator color="#C62828" size="small" />
          ) : (
            <Text style={styles.cancelLinkText}>Cancel request</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {canConfirmReceived ? (
        <TouchableOpacity
          style={[styles.requestBtn, confirming && styles.btnDisabled]}
          onPress={onConfirmReceived}
          disabled={confirming}
          activeOpacity={0.85}
        >
          {confirming ? (
            <ActivityIndicator color={THEME.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={16} color={THEME.white} />
              <Text style={styles.requestBtnText}>Confirm received</Text>
            </>
          )}
        </TouchableOpacity>
      ) : waitingForProvider ? (
        <View style={styles.waitingRow}>
          <Ionicons name="time-outline" size={16} color="#757575" />
          <Text style={styles.waitingText}>Waiting for provider to confirm</Text>
        </View>
      ) : null}
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
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  productName: { flex: 1, fontSize: 16, fontWeight: "700", color: THEME.deepGreen },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  farmerText: { fontSize: 13, color: "#616161", marginTop: 4 },
  metaText: { fontSize: 13, color: "#757575", marginTop: 6 },
  priceText: { fontSize: 16, fontWeight: "700", color: THEME.accent, marginTop: 6 },

  requestBtn: {
    marginTop: 12,
    backgroundColor: THEME.accent,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  requestBtnText: { fontSize: 13, fontWeight: "700", color: THEME.white },

  transportRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transportText: { fontSize: 13, fontWeight: "600" },

  cancelLink: { marginTop: 8, alignSelf: "flex-start" },
  cancelLinkText: { fontSize: 12, fontWeight: "700", color: "#C62828" },

  waitingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  waitingText: { fontSize: 13, fontWeight: "600", color: "#757575" },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: THEME.deepGreen },
  modalBody: { padding: 20, paddingBottom: 40 },

  summaryCard: {
    backgroundColor: THEME.bgLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  summaryProduct: { fontSize: 15, fontWeight: "700", color: THEME.deepGreen },
  summaryMeta: { fontSize: 13, color: "#616161" },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.deepGreen,
    marginTop: 12,
    marginBottom: 6,
  },
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
  helperText: { fontSize: 11, color: "#9E9E9E", marginTop: 4 },
  errorText: { fontSize: 13, color: "#D32F2F", marginTop: 12 },

  submitBtn: {
    marginTop: 20,
    backgroundColor: THEME.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: THEME.white },
  btnDisabled: { opacity: 0.65 },
  cancelBtn: { marginTop: 12, alignItems: "center", paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#757575" },
});
