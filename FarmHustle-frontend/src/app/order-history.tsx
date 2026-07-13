import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { getOrdersByBuyer, Order, OrderStatus } from "../api/client";
import { useAuth } from "../context/AuthContext";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  bgLight: "#F4F7F5",
};

const HISTORY_STATUSES = ["COMPLETED", "DELIVERED", "CANCELLED"] as const;

const STATUS_META: Partial<Record<OrderStatus, { label: string; bg: string; fg: string }>> = {
  COMPLETED: { label: "Completed", bg: "#E0EDE4", fg: "#1B3A2B" },
  DELIVERED: { label: "Delivered", bg: "#E8F5E9", fg: "#2E7D32" },
  CANCELLED: { label: "Cancelled", bg: "#FCE4EC", fg: "#C62828" },
};

function formatShortDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrderHistoryScreen() {
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
      setOrders(data.filter((o) => (HISTORY_STATUSES as readonly string[]).includes(o.status)));
    } catch {
      // silently fail — list stays as-is
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={THEME.deepGreen} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Order History
        </Text>
        <View style={styles.navSpacer} />
      </View>

      {!user ? (
        <View style={styles.centered}>
          <Ionicons name="log-in-outline" size={40} color="#9E9E9E" />
          <Text style={styles.emptyText}>Please log in to see your order history.</Text>
        </View>
      ) : loading ? (
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
              <Ionicons name="time-outline" size={40} color="#9E9E9E" />
              <Text style={styles.emptyText}>No history yet.</Text>
            </View>
          }
          renderItem={({ item }) => <OrderHistoryCard order={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function OrderHistoryCard({ order }: { order: Order }) {
  const meta = STATUS_META[order.status];
  const price = order.agreedPrice ?? order.initialPrice;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.productName} numberOfLines={1}>
          {order.product?.name ?? "Unknown product"}
        </Text>
        {meta ? (
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.metaText}>from {order.farmer?.name ?? "Unknown farmer"}</Text>
      <Text style={styles.metaText}>
        {order.quantity} {order.product?.unit ?? ""}
      </Text>

      <View style={styles.cardBottomRow}>
        <Text style={styles.priceText}>GHS {price}</Text>
        <Text style={styles.dateText}>{formatShortDate(order.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    backgroundColor: THEME.white,
  },
  backBtn: { padding: 4 },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: THEME.deepGreen,
  },
  navSpacer: { width: 30 },

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

  metaText: { fontSize: 13, color: "#616161", marginTop: 4 },

  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  priceText: { fontSize: 16, fontWeight: "700", color: THEME.accent },
  dateText: { fontSize: 12, color: "#9E9E9E" },
});
