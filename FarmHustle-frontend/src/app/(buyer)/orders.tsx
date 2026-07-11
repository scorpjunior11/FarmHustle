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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getOrdersByBuyer, Order, OrderStatus } from "../../api/client";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await getOrdersByBuyer(user.id);
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

  const handleRequestTransport = () => {
    Alert.alert("Coming next", "Requesting transport will be available soon.");
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
          renderItem={({ item }) => (
            <OrderCard order={item} onRequestTransport={handleRequestTransport} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  onRequestTransport,
}: {
  order: Order;
  onRequestTransport: () => void;
}) {
  const meta = STATUS_META[order.status];
  const price = order.agreedPrice ?? order.initialPrice;

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

      {order.status === "PAID" ? (
        <TouchableOpacity
          style={styles.requestBtn}
          onPress={onRequestTransport}
          activeOpacity={0.85}
        >
          <Ionicons name="car-outline" size={16} color={THEME.white} />
          <Text style={styles.requestBtnText}>Request transport</Text>
        </TouchableOpacity>
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
});
