import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getOrdersByFarmer, Order } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  bgLight: "#F4F7F5",
};

const EARNED_STATUSES = ["PAID", "DELIVERED", "COMPLETED"] as const;

const netOf = (order: Order) => (order.agreedPrice ?? order.initialPrice) * 0.95;

export default function EarningsScreen() {
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
      const data = await getOrdersByFarmer(user.id);
      setOrders(data);
    } catch {
      // silently fail — list stays as-is
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

  const earnedOrders = orders.filter((o) =>
    (EARNED_STATUSES as readonly string[]).includes(o.status)
  );
  const totalEarned = earnedOrders.reduce((sum, o) => sum + netOf(o), 0);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Earnings</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="log-in-outline" size={40} color="#9E9E9E" />
          <Text style={styles.emptyText}>Please log in to see your earnings.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.accent} />
        </View>
      ) : (
        <FlatList
          data={earnedOrders}
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
          ListHeaderComponent={
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total earned</Text>
              <Text style={styles.totalValue}>GHS {totalEarned.toFixed(2)}</Text>
              <Text style={styles.totalMeta}>
                {earnedOrders.length} {earnedOrders.length === 1 ? "order" : "orders"} · after 5%
                commission
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="wallet-outline" size={40} color="#9E9E9E" />
              <Text style={styles.emptyText}>No earnings yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.product?.name ?? "Unknown product"}
                  </Text>
                  <Text style={styles.buyerText}>
                    Sold to {item.buyer?.name ?? "Unknown buyer"}
                  </Text>
                </View>
                <Text style={styles.netText}>GHS {netOf(item).toFixed(2)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
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

  totalCard: {
    backgroundColor: THEME.deepGreen,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  totalLabel: { fontSize: 13, fontWeight: "600", color: "#A9C3B3" },
  totalValue: { fontSize: 28, fontWeight: "800", color: THEME.white, marginTop: 4 },
  totalMeta: { fontSize: 12, color: "#A9C3B3", marginTop: 6 },

  card: {
    backgroundColor: THEME.bgLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardLeft: { flex: 1 },
  productName: { fontSize: 15, fontWeight: "700", color: THEME.deepGreen },
  buyerText: { fontSize: 13, color: "#616161", marginTop: 4 },
  netText: { fontSize: 15, fontWeight: "700", color: THEME.accent },
});
