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
import { getDeliveries, Delivery } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  bgLight: "#F4F7F5",
};

const netOf = (delivery: Delivery) => (delivery.deliveryFee ?? 0) * 0.9;

export default function TransportEarningsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const deliveredJobs = deliveries.filter(
    (d) => d.provider?.id === user?.id && d.status === "DELIVERED"
  );
  const totalEarned = deliveredJobs.reduce((sum, d) => sum + netOf(d), 0);

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
          data={deliveredJobs}
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
          ListHeaderComponent={
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total earned</Text>
              <Text style={styles.totalValue}>GHS {totalEarned.toFixed(2)}</Text>
              <Text style={styles.totalMeta}>
                {deliveredJobs.length} {deliveredJobs.length === 1 ? "delivery" : "deliveries"} ·
                after 10% commission
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
                <View style={styles.routeRow}>
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.pickupLocation ?? "Unknown"}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={THEME.accent}
                    style={styles.routeArrow}
                  />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.deliveryLocation ?? "Unknown"}
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
  routeRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  routeText: { flexShrink: 1, fontSize: 14, fontWeight: "700", color: THEME.deepGreen },
  routeArrow: { flexShrink: 0 },
  netText: { fontSize: 15, fontWeight: "700", color: THEME.accent },
});
