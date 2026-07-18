import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getDeliveries, Delivery } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../theme/theme";

const { colors } = THEME;
const HAIRLINE = "#EEEEEE";
const EMPTY_CIRCLE = "#E8F3E9";

const cardShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} as const;

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

  const Banner = () => (
    <View style={styles.banner}>
      <View style={styles.brandRow}>
        <Image
          source={require("../../../assets/images/farmhustle-mark.png")}
          style={styles.brandMark}
          resizeMode="contain"
        />
        <Text style={styles.wordmark}>
          Farm<Text style={styles.wordmarkAccent}>Hustle</Text>
        </Text>
      </View>
      <View style={styles.bannerTopRow}>
        <Text style={styles.bannerLabel}>Total earned</Text>
        <View style={styles.goldChip}>
          <Ionicons name="wallet-outline" size={16} color={colors.accentText} />
        </View>
      </View>
      <Text style={styles.totalValue}>GHS {loading ? "—" : totalEarned.toFixed(2)}</Text>
      <Text style={styles.totalMeta}>
        {deliveredJobs.length} {deliveredJobs.length === 1 ? "delivery" : "deliveries"} · after 10% commission
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
            data={deliveredJobs}
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
              deliveredJobs.length > 0 ? (
                <Text style={styles.sectionLabel}>Completed deliveries</Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyCircle}>
                  <Ionicons name="wallet-outline" size={40} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No earnings yet</Text>
                <Text style={styles.emptySub}>Complete deliveries and your earnings will show up here.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.routeRow}>
                    <Ionicons name="location-outline" size={14} color={colors.primary} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      {item.pickupLocation ?? "Unknown"}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={colors.textMuted}
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
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  brandMark: { width: 48, height: 48, justifyContent: "center", alignItems: "center" },
  wordmark: { fontSize: 18, fontWeight: "800", color: colors.white, letterSpacing: 0.2 },
  wordmarkAccent: { color: colors.accent },
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
    backgroundColor: EMPTY_CIRCLE,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 20 },

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
  routeRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  routeText: { flexShrink: 1, fontSize: 14, fontWeight: "800", color: colors.text },
  routeArrow: { flexShrink: 0 },
  netText: { fontSize: 16, fontWeight: "800", color: colors.primary },
});
