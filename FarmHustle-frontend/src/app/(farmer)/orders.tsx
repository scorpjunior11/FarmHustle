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
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getOrdersByFarmer, updateOrderStatus, Order, OrderStatus } from "../../api/client";
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

export default function FarmerOrdersScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOrderId, setActingOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await getOrdersByFarmer(user.id);
      setOrders(data);
    } catch {
      // silently fail — orders list stays as-is
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const applyStatusChange = async (orderId: string, status: OrderStatus) => {
    setActingOrderId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      Alert.alert(
        "Action failed",
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setActingOrderId(null);
    }
  };

  const handleAccept = (order: Order) => {
    Alert.alert(
      "Accept order",
      `Accept the order for ${order.product?.name ?? "this product"}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Accept", onPress: () => applyStatusChange(order.id, "AWAITING_PAYMENT") },
      ]
    );
  };

  const handleDecline = (order: Order) => {
    Alert.alert(
      "Decline order",
      `Decline the order for ${order.product?.name ?? "this product"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => applyStatusChange(order.id, "CANCELLED"),
        },
      ]
    );
  };

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  const Banner = () => (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>Incoming Orders</Text>
      <View style={styles.bannerBottom}>
        <Text style={styles.bannerSubtitle}>Accept or decline buyer orders</Text>
        {pendingCount > 0 ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Banner />
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
      <Banner />

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
              <View style={styles.emptyState}>
                <View style={styles.emptyCircle}>
                  <Ionicons name="receipt-outline" size={40} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No orders yet</Text>
                <Text style={styles.emptySub}>New orders from buyers will appear here</Text>
              </View>
            }
            renderItem={({ item }) => (
              <OrderCard
                order={item}
                busy={actingOrderId === item.id}
                onAccept={() => handleAccept(item)}
                onDecline={() => handleDecline(item)}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  busy,
  onAccept,
  onDecline,
}: {
  order: Order;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const meta = STATUS_META[order.status];
  const total = order.agreedPrice ?? order.initialPrice;
  const earnings = typeof total === "number" ? total * 0.95 : null;

  return (
    <View style={[styles.card, busy && styles.cardBusy]}>
      <View style={styles.cardTopRow}>
        <Text style={styles.productName} numberOfLines={1}>
          {order.product?.name ?? "Unknown product"}
        </Text>
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={styles.buyerText}>
        {order.buyer?.name ?? "Unknown buyer"} · {order.buyer?.city ?? ""}
      </Text>

      {order.buyer?.phone ? (
        <TouchableOpacity
          style={styles.callRow}
          onPress={() => Linking.openURL(`tel:${order.buyer!.phone}`)}
          activeOpacity={0.7}
        >
          <Ionicons name="call-outline" size={14} color={colors.primary} />
          <Text style={styles.callText}>{order.buyer.phone}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.metaRow}>
        <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
        <Text style={styles.metaText}>
          {order.quantity} {order.product?.unit ?? ""}
        </Text>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceText}>GHS {total?.toFixed(2) ?? "0.00"}</Text>
      </View>

      {earnings !== null ? (
        <Text style={styles.earningsText}>
          You earn GHS {earnings.toFixed(2)} after 5% commission
        </Text>
      ) : null}

      {order.status === "PENDING" ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.declineBtn, busy && styles.btnDisabled]}
            onPress={onDecline}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <>
                <Ionicons name="close-outline" size={16} color={colors.danger} />
                <Text style={styles.declineBtnText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, busy && styles.btnDisabled]}
            onPress={onAccept}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={16} color={colors.white} />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  body: { flex: 1, backgroundColor: colors.bg },

  // Green banner
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerTitle: { fontSize: 22, fontWeight: "800", color: colors.white },
  bannerBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  bannerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.85)" },
  pendingBadge: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: "800", color: colors.accentText },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingTop: 60,
  },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: "center", paddingHorizontal: 32 },

  emptyState: { alignItems: "center", paddingTop: 70, paddingHorizontal: 40, gap: 8 },
  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: "center" },

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
  cardBusy: { opacity: 0.7 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  productName: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  buyerText: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  callRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  callText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  metaText: { fontSize: 13, color: colors.textMuted },
  priceRow: { marginTop: 8 },
  priceText: { fontSize: 18, fontWeight: "800", color: colors.primary },
  earningsText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  acceptBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  acceptBtnText: { fontSize: 13, fontWeight: "700", color: colors.white },
  declineBtn: {
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
  declineBtnText: { fontSize: 13, fontWeight: "700", color: colors.danger },
  btnDisabled: { opacity: 0.6 },
});
