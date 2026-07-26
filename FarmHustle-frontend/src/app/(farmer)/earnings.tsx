import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getOrdersByFarmer, Order } from "../../api/client";
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

const EARNED_STATUSES = ["PAID", "DELIVERED", "COMPLETED"] as const;

const netOf = (order: Order) => (order.agreedPrice ?? order.initialPrice) * 0.95;

export default function EarningsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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

  const Banner = () => (
    <View style={styles.banner}>
      <View style={styles.bannerTopRow}>
        <Text style={styles.bannerLabel}>Total earned</Text>
        <View style={styles.goldChip}>
          <Ionicons name="wallet-outline" size={16} color={colors.accentText} />
        </View>
      </View>
      <Text style={styles.totalValue}>GHS {loading ? "—" : totalEarned.toFixed(2)}</Text>
      <Text style={styles.totalMeta}>
        {earnedOrders.length} {earnedOrders.length === 1 ? "order" : "orders"} · after 5% commission
      </Text>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Banner />
        <View style={styles.body}>
          <View style={styles.centered}>
            <Ionicons name="log-in-outline" size={40} color="#9E9E9E" />
            <Text style={styles.emptyText}>Please log in to see your earnings.</Text>
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
            data={earnedOrders}
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
            ListHeaderComponent={
              earnedOrders.length > 0 ? (
                <Text style={styles.sectionLabel}>Recent sales</Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyCircle}>
                  <Ionicons name="wallet-outline" size={40} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No earnings yet</Text>
                <Text style={styles.emptySub}>Your completed sales will show here</Text>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  body: { flex: 1, backgroundColor: colors.bg },

  // Green banner (hero total)
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  goldChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  totalValue: { fontSize: 34, fontWeight: "800", color: colors.white, marginTop: 8 },
  totalMeta: { fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 6 },

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
  sectionLabel: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 12 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HAIRLINE,
    padding: 16,
    marginBottom: 12,
    ...cardShadow,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardLeft: { flex: 1 },
  productName: { fontSize: 15, fontWeight: "800", color: colors.text },
  buyerText: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  netText: { fontSize: 16, fontWeight: "800", color: colors.primary },
});
