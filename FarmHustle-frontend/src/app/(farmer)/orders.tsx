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

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Incoming Orders</Text>
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
        <Text style={styles.headerTitle}>Incoming Orders</Text>
        {pendingCount > 0 ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.accent} />
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
          <Ionicons name="call-outline" size={14} color={THEME.accent} />
          <Text style={styles.callText}>{order.buyer.phone}</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.metaText}>
        {order.quantity} {order.product?.unit ?? ""}
      </Text>

      <Text style={styles.priceText}>GHS {total?.toFixed(2) ?? "0.00"}</Text>

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
              <ActivityIndicator color={THEME.deepGreen} size="small" />
            ) : (
              <>
                <Ionicons name="close-outline" size={16} color={THEME.deepGreen} />
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
              <ActivityIndicator color={THEME.white} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={16} color={THEME.white} />
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
  safe: { flex: 1, backgroundColor: THEME.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.deepGreen },
  pendingBadge: {
    backgroundColor: "#FFF3E0",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: "700", color: "#E65100" },

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
  cardBusy: { opacity: 0.7 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  productName: { flex: 1, fontSize: 16, fontWeight: "700", color: THEME.deepGreen },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  buyerText: { fontSize: 13, color: "#616161", marginTop: 4 },
  callRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  callText: { fontSize: 13, color: THEME.accent, fontWeight: "600" },
  metaText: { fontSize: 13, color: "#757575", marginTop: 6 },
  priceText: { fontSize: 16, fontWeight: "700", color: THEME.accent, marginTop: 6 },
  earningsText: { fontSize: 12, color: "#757575", marginTop: 2 },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  acceptBtn: {
    flex: 1,
    backgroundColor: THEME.accent,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  acceptBtnText: { fontSize: 13, fontWeight: "700", color: THEME.white },
  declineBtn: {
    flex: 1,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  declineBtnText: { fontSize: 13, fontWeight: "700", color: THEME.deepGreen },
  btnDisabled: { opacity: 0.6 },
});
