import { useCallback, useState } from "react";
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
  Image,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLiveData } from "../../hooks/useLiveData";
import {
  getOrdersByBuyer,
  requestDelivery,
  getDeliveries,
  confirmDeliveryByBuyer,
  cancelDelivery,
  acceptDeliveryFee,
  declineDeliveryFee,
  initializePayment,
  initializeDeliveryPayment,
  updateOrderStatus,
  Order,
  OrderStatus,
  Delivery,
  AuthUser,
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../theme/theme";

const { colors } = THEME;
const HAIRLINE = "#EEEEEE";

const cardShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} as const;

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
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<string | null>(null);
  const [cancelingDeliveryId, setCancelingDeliveryId] = useState<string | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [payingDeliveryId, setPayingDeliveryId] = useState<string | null>(null);
  const [acceptingFeeDeliveryId, setAcceptingFeeDeliveryId] = useState<string | null>(null);
  const [decliningFeeDeliveryId, setDecliningFeeDeliveryId] = useState<string | null>(null);
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);

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

  const isActionInProgress =
    confirmingDeliveryId !== null ||
    cancelingDeliveryId !== null ||
    payingOrderId !== null ||
    payingDeliveryId !== null ||
    acceptingFeeDeliveryId !== null ||
    decliningFeeDeliveryId !== null ||
    cancelingOrderId !== null;

  useLiveData(fetchData, { isActionInProgress });

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

  const handlePayNow = async (order: Order) => {
    setPayingOrderId(order.id);
    try {
      const { authorizationUrl, reference } = await initializePayment(order.id);
      router.push({
        pathname: "/payment-webview",
        params: { authorizationUrl, reference },
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Could not start payment", raw.replace(/^\d{3}:\s*/, ""));
    } finally {
      setPayingOrderId(null);
    }
  };

  const handlePayDeliveryFee = async (delivery: Delivery) => {
    setPayingDeliveryId(delivery.id);
    try {
      const { authorizationUrl, reference } = await initializeDeliveryPayment(delivery.id);
      router.push({
        pathname: "/payment-webview",
        params: { authorizationUrl, reference, kind: "delivery" },
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Could not start payment", raw.replace(/^\d{3}:\s*/, ""));
    } finally {
      setPayingDeliveryId(null);
    }
  };

  const handleAcceptFee = async (delivery: Delivery) => {
    setAcceptingFeeDeliveryId(delivery.id);
    try {
      const updated = await acceptDeliveryFee(delivery.id);
      setDeliveries((prev) => prev.map((d) => (d.id === delivery.id ? updated : d)));
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Could not accept fee", raw.replace(/^\d{3}:\s*/, ""));
    } finally {
      setAcceptingFeeDeliveryId(null);
    }
  };

  const handleDeclineFee = (delivery: Delivery) => {
    Alert.alert(
      "Decline fee",
      `Decline the proposed fee of GHS ${delivery.deliveryFee ?? 0}? The request will go back to finding a provider.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setDecliningFeeDeliveryId(delivery.id);
            try {
              const updated = await declineDeliveryFee(delivery.id);
              setDeliveries((prev) => prev.map((d) => (d.id === delivery.id ? updated : d)));
            } catch (err) {
              const raw = err instanceof Error ? err.message : "Something went wrong.";
              Alert.alert("Could not decline fee", raw.replace(/^\d{3}:\s*/, ""));
            } finally {
              setDecliningFeeDeliveryId(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelOrder = (order: Order) => {
    Alert.alert(
      "Cancel order",
      "Cancel this order?",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel order",
          style: "destructive",
          onPress: async () => {
            setCancelingOrderId(order.id);
            try {
              const updated = await updateOrderStatus(order.id, "CANCELLED");
              setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
            } catch (err) {
              const raw = err instanceof Error ? err.message : "Something went wrong.";
              Alert.alert("Could not cancel order", raw.replace(/^\d{3}:\s*/, ""));
            } finally {
              setCancelingOrderId(null);
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
    const pickup = pickupLocation.trim();
    const destination = deliveryLocation.trim();
    if (!pickup || !destination) {
      setFormError("Please fill in both the pickup point and the destination.");
      return;
    }
    if (pickup.length < 2 || destination.length < 2) {
      setFormError("Pickup and destination must be at least 2 characters.");
      return;
    }
    if (pickup.length > 60 || destination.length > 60) {
      setFormError("Pickup and destination must be 60 characters or fewer.");
      return;
    }
    if (pickup.toLowerCase() === destination.toLowerCase()) {
      setFormError("Pickup and destination can't be the same.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await requestDelivery({
        orderId: transportOrder.id,
        pickupLocation: pickup,
        deliveryLocation: destination,
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
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>My Orders</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.centered}>
            <Ionicons name="log-in-outline" size={40} color="#9E9E9E" />
            <Text style={styles.emptyText}>Please log in to see your orders.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>My Orders</Text>
        <Text style={styles.bannerSubtitle}>Track and manage your purchases</Text>
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 68 }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="receipt-outline" size={44} color="#C8E6C9" />
                <Text style={styles.emptyText}>No orders yet.</Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => router.navigate("/(buyer)")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="leaf-outline" size={16} color={colors.white} />
                  <Text style={styles.browseBtnText}>Browse crops</Text>
                </TouchableOpacity>
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
                  paying={payingOrderId === item.id}
                  payingFee={delivery !== null && payingDeliveryId === delivery.id}
                  acceptingFee={delivery !== null && acceptingFeeDeliveryId === delivery.id}
                  decliningFee={delivery !== null && decliningFeeDeliveryId === delivery.id}
                  cancelingOrder={cancelingOrderId === item.id}
                  onRequestTransport={() => openTransportModal(item)}
                  onConfirmReceived={() => delivery && handleConfirmReceived(delivery)}
                  onCancelDelivery={() => delivery && handleCancelDelivery(delivery)}
                  onPayNow={() => handlePayNow(item)}
                  onPayDeliveryFee={() => delivery && handlePayDeliveryFee(delivery)}
                  onAcceptFee={() => delivery && handleAcceptFee(delivery)}
                  onDeclineFee={() => delivery && handleDeclineFee(delivery)}
                  onCancelOrder={() => handleCancelOrder(item)}
                />
              );
            }}
          />
        )}
      </View>

      {/* Request Transport Modal */}
      <Modal
        visible={transportOrder !== null}
        animationType="slide"
        onRequestClose={closeTransportModal}
      >
        <SafeAreaView style={styles.modalSafe} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Transport</Text>
            <TouchableOpacity
              onPress={closeTransportModal}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={colors.text} />
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
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
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
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="car-outline" size={18} color={colors.white} />
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
  "REQUESTED" | "FEE_PROPOSED" | "ACCEPTED" | "IN_TRANSIT" | "DELIVERED",
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  REQUESTED: { icon: "hourglass-outline", color: "#F57F17" },
  FEE_PROPOSED: { icon: "pricetag-outline", color: "#6A1B9A" },
  ACCEPTED: { icon: "checkmark-circle-outline", color: "#2E7D32" },
  IN_TRANSIT: { icon: "car-outline", color: "#1565C0" },
  DELIVERED: { icon: "checkmark-done-outline", color: "#2E7D32" },
};

function transportStatusLabel(delivery: Delivery): string {
  switch (delivery.status) {
    case "REQUESTED":
      return "Transport requested — finding a provider";
    case "FEE_PROPOSED":
      return `Provider proposes GHS ${delivery.deliveryFee ?? 0}`;
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

// Shown for FEE_PROPOSED (deciding whether to accept a stranger's fee) and for
// ACCEPTED/IN_TRANSIT (reaching the provider who is actually carrying the goods).
function ProviderCard({
  provider,
  deliveryFee,
}: {
  provider: AuthUser;
  deliveryFee: number | null;
}) {
  return (
    <View style={styles.providerCard}>
      <View style={styles.providerTopRow}>
        {provider.profilePhotoUrl ? (
          <Image
            source={{ uri: provider.profilePhotoUrl }}
            style={styles.providerAvatarImage}
            accessibilityLabel={`Photo of ${provider.name}`}
          />
        ) : (
          <View style={styles.providerAvatarPlaceholder}>
            <Ionicons name="person" size={22} color={colors.primary} />
          </View>
        )}
        <View style={styles.providerInfo}>
          <Text style={styles.providerName} numberOfLines={1}>
            {provider.name}
          </Text>
          <View style={styles.providerMetaRow}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.providerMetaText} numberOfLines={1}>
              {provider.city}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.providerCallRow}
            onPress={() => Linking.openURL(`tel:${provider.phone}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={13} color={colors.primary} />
            <Text style={styles.providerCallText}>{provider.phone}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.providerFeeRow}>
        <Text style={styles.providerFeeLabel}>Delivery fee</Text>
        <Text style={styles.providerFeeValue}>GHS {deliveryFee ?? 0}</Text>
      </View>
    </View>
  );
}

function OrderCard({
  order,
  delivery,
  confirming,
  canceling,
  paying,
  payingFee,
  acceptingFee,
  decliningFee,
  cancelingOrder,
  onRequestTransport,
  onConfirmReceived,
  onCancelDelivery,
  onPayNow,
  onPayDeliveryFee,
  onAcceptFee,
  onDeclineFee,
  onCancelOrder,
}: {
  order: Order;
  delivery: Delivery | null;
  confirming: boolean;
  canceling: boolean;
  paying: boolean;
  payingFee: boolean;
  acceptingFee: boolean;
  decliningFee: boolean;
  cancelingOrder: boolean;
  onRequestTransport: () => void;
  onConfirmReceived: () => void;
  onCancelDelivery: () => void;
  onPayNow: () => void;
  onPayDeliveryFee: () => void;
  onAcceptFee: () => void;
  onDeclineFee: () => void;
  onCancelOrder: () => void;
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

      {order.status === "PENDING" ? (
        <TouchableOpacity
          style={[styles.cancelOrderBtn, cancelingOrder && styles.btnDisabled]}
          onPress={onCancelOrder}
          disabled={cancelingOrder}
          activeOpacity={0.85}
        >
          {cancelingOrder ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <>
              <Ionicons name="close-outline" size={16} color={colors.danger} />
              <Text style={styles.cancelOrderBtnText}>Cancel order</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      {order.status === "AWAITING_PAYMENT" ? (
        <TouchableOpacity
          style={[styles.requestBtn, paying && styles.btnDisabled]}
          onPress={onPayNow}
          disabled={paying}
          activeOpacity={0.85}
        >
          {paying ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="card-outline" size={16} color={colors.white} />
              <Text style={styles.requestBtnText}>Pay now</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      {order.status === "PAID" && !delivery ? (
        <TouchableOpacity
          style={styles.requestBtn}
          onPress={onRequestTransport}
          activeOpacity={0.85}
        >
          <Ionicons name="car-outline" size={16} color={colors.white} />
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

      {delivery &&
      (delivery.status === "ACCEPTED" || delivery.status === "IN_TRANSIT") &&
      delivery.provider ? (
        <ProviderCard provider={delivery.provider} deliveryFee={delivery.deliveryFee} />
      ) : null}

      {delivery && delivery.status === "ACCEPTED" && delivery.feePaid !== true ? (
        <TouchableOpacity
          style={[styles.requestBtn, payingFee && styles.btnDisabled]}
          onPress={onPayDeliveryFee}
          disabled={payingFee}
          activeOpacity={0.85}
        >
          {payingFee ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="card-outline" size={16} color={colors.white} />
              <Text style={styles.requestBtnText}>
                Pay delivery fee — GHS {delivery.deliveryFee ?? 0}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : delivery && delivery.feePaid === true ? (
        <View style={styles.feePaidRow}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.feePaidText}>Delivery fee paid</Text>
        </View>
      ) : null}

      {delivery && delivery.status === "FEE_PROPOSED" ? (
        <>
          {delivery.provider ? (
            <ProviderCard provider={delivery.provider} deliveryFee={delivery.deliveryFee} />
          ) : null}
          <View style={styles.feeDecisionRow}>
            <TouchableOpacity
              style={[styles.declineFeeBtn, (acceptingFee || decliningFee) && styles.btnDisabled]}
              onPress={onDeclineFee}
              disabled={acceptingFee || decliningFee}
              activeOpacity={0.85}
            >
              {decliningFee ? (
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <>
                  <Ionicons name="close-outline" size={16} color={colors.danger} />
                  <Text style={styles.declineFeeBtnText}>Decline</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptFeeBtn, (acceptingFee || decliningFee) && styles.btnDisabled]}
              onPress={onAcceptFee}
              disabled={acceptingFee || decliningFee}
              activeOpacity={0.85}
            >
              {acceptingFee ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={16} color={colors.white} />
                  <Text style={styles.requestBtnText}>Accept fee</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {delivery && delivery.status === "REQUESTED" ? (
        <TouchableOpacity
          style={styles.cancelLink}
          onPress={onCancelDelivery}
          disabled={canceling}
          activeOpacity={0.7}
        >
          {canceling ? (
            <ActivityIndicator color={colors.danger} size="small" />
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
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
              <Text style={styles.requestBtnText}>Confirm received</Text>
            </>
          )}
        </TouchableOpacity>
      ) : waitingForProvider ? (
        <View style={styles.waitingRow}>
          <Ionicons name="hourglass-outline" size={16} color={colors.textMuted} />
          <Text style={styles.waitingText}>Waiting for provider to confirm</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  body: { flex: 1, backgroundColor: colors.bg },

  // Green banner header
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerTitle: { fontSize: 22, fontWeight: "800", color: colors.white },
  bannerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingTop: 60,
  },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: "center", paddingHorizontal: 32 },
  browseBtn: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  browseBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },

  listContent: { padding: 16, flexGrow: 1 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HAIRLINE,
    padding: 16,
    marginBottom: 14,
    ...cardShadow,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  productName: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  farmerText: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  metaText: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  priceText: { fontSize: 18, fontWeight: "800", color: colors.primary, marginTop: 8 },

  requestBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  requestBtnText: { fontSize: 13, fontWeight: "700", color: colors.white },

  transportRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transportText: { fontSize: 13, fontWeight: "600" },

  cancelLink: { marginTop: 10, alignSelf: "flex-start" },
  cancelLinkText: { fontSize: 12, fontWeight: "700", color: colors.danger },

  feePaidRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feePaidText: { fontSize: 13, fontWeight: "700", color: colors.primary },

  providerCard: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: HAIRLINE,
  },
  providerTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  providerAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  providerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  providerInfo: { flex: 1, minWidth: 0, gap: 3 },
  providerName: { fontSize: 14, fontWeight: "800", color: colors.text },
  providerMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  providerMetaText: { fontSize: 12.5, color: colors.textMuted },
  providerCallRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  providerCallText: { fontSize: 12.5, color: colors.primary, fontWeight: "600" },
  providerFeeRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  providerFeeLabel: { fontSize: 12.5, fontWeight: "600", color: colors.textMuted },
  providerFeeValue: { fontSize: 16, fontWeight: "800", color: colors.primary },

  feeDecisionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  acceptFeeBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  declineFeeBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E57373",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  declineFeeBtnText: { fontSize: 13, fontWeight: "700", color: colors.danger },

  cancelOrderBtn: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E57373",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  cancelOrderBtnText: { fontSize: 13, fontWeight: "700", color: colors.danger },

  waitingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  waitingText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },

  // Modal
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalBody: { padding: 20, paddingBottom: 40 },

  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HAIRLINE,
    padding: 14,
    marginBottom: 16,
    gap: 4,
    ...cardShadow,
  },
  summaryProduct: { fontSize: 15, fontWeight: "800", color: colors.text },
  summaryMeta: { fontSize: 13, color: colors.textMuted },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.card,
  },
  helperText: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  errorText: { fontSize: 13, color: colors.danger, marginTop: 12 },

  submitBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: colors.white },
  btnDisabled: { opacity: 0.65 },
  cancelBtn: { marginTop: 12, alignItems: "center", paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
});
