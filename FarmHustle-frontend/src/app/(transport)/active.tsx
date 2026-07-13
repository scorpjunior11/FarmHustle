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
import {
  getDeliveries,
  updateDeliveryStatus,
  confirmDeliveryByProvider,
  Delivery,
  DeliveryStatus,
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  bgLight: "#F4F7F5",
};

const STATUS_META: Partial<Record<DeliveryStatus, { label: string; bg: string; fg: string }>> = {
  FEE_PROPOSED: { label: "Awaiting buyer", bg: "#F3E5F5", fg: "#6A1B9A" },
  ACCEPTED: { label: "Accepted", bg: "#FFF8E1", fg: "#F57F17" },
  IN_TRANSIT: { label: "In transit", bg: "#E3F2FD", fg: "#1565C0" },
};

export default function ActiveDeliveriesScreen() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingDeliveryId, setActingDeliveryId] = useState<string | null>(null);

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

  const handleStartDelivery = async (delivery: Delivery) => {
    setActingDeliveryId(delivery.id);
    try {
      const updated = await updateDeliveryStatus(delivery.id, "IN_TRANSIT");
      setDeliveries((prev) => prev.map((d) => (d.id === delivery.id ? updated : d)));
    } catch (err) {
      Alert.alert(
        "Action failed",
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setActingDeliveryId(null);
    }
  };

  const handleMarkDelivered = async (delivery: Delivery) => {
    setActingDeliveryId(delivery.id);
    try {
      const updated = await confirmDeliveryByProvider(delivery.id);
      setDeliveries((prev) => prev.map((d) => (d.id === delivery.id ? updated : d)));
    } catch (err) {
      Alert.alert(
        "Action failed",
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setActingDeliveryId(null);
    }
  };

  const activeJobs = deliveries.filter(
    (d) =>
      d.provider?.id === user?.id &&
      (d.status === "FEE_PROPOSED" || d.status === "ACCEPTED" || d.status === "IN_TRANSIT")
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Active Deliveries</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="log-in-outline" size={40} color="#9E9E9E" />
          <Text style={styles.emptyText}>Please log in to see your active deliveries.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Deliveries</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.accent} />
        </View>
      ) : (
        <FlatList
          data={activeJobs}
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
              <Ionicons name="cube-outline" size={40} color="#9E9E9E" />
              <Text style={styles.emptyText}>No active deliveries.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <DeliveryCard
              delivery={item}
              busy={actingDeliveryId === item.id}
              onStart={() => handleStartDelivery(item)}
              onMarkDelivered={() => handleMarkDelivered(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function DeliveryCard({
  delivery,
  busy,
  onStart,
  onMarkDelivered,
}: {
  delivery: Delivery;
  busy: boolean;
  onStart: () => void;
  onMarkDelivered: () => void;
}) {
  const order = delivery.order;
  const meta = STATUS_META[delivery.status];
  const waitingForBuyer = delivery.status === "IN_TRANSIT" && delivery.providerConfirmed;

  return (
    <View style={[styles.card, busy && styles.cardBusy]}>
      <View style={styles.cardTopRow}>
        <View style={styles.routeRow}>
          <Text style={styles.routeText} numberOfLines={1}>
            {delivery.pickupLocation ?? "Unknown"}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={THEME.accent} style={styles.routeArrow} />
          <Text style={styles.routeText} numberOfLines={1}>
            {delivery.deliveryLocation ?? "Unknown"}
          </Text>
        </View>
        {meta ? (
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
          </View>
        ) : null}
      </View>

      {order ? (
        <Text style={styles.detailText}>
          {order.product?.name ?? "Unknown product"} · {order.quantity}{" "}
          {order.product?.unit ?? ""} for {order.buyer?.name ?? "Unknown buyer"}
        </Text>
      ) : (
        <Text style={styles.detailText}>Standalone delivery</Text>
      )}

      <Text style={styles.feeText}>GHS {delivery.deliveryFee ?? "0"}</Text>

      {delivery.status === "FEE_PROPOSED" ? (
        <View style={styles.waitingRow}>
          <Ionicons name="time-outline" size={16} color="#757575" />
          <Text style={styles.waitingText}>Waiting for buyer to accept fee</Text>
        </View>
      ) : delivery.status === "ACCEPTED" ? (
        <TouchableOpacity
          style={[styles.actionBtn, busy && styles.btnDisabled]}
          onPress={onStart}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={THEME.white} size="small" />
          ) : (
            <>
              <Ionicons name="play-outline" size={16} color={THEME.white} />
              <Text style={styles.actionBtnText}>Start delivery</Text>
            </>
          )}
        </TouchableOpacity>
      ) : waitingForBuyer ? (
        <View style={styles.waitingRow}>
          <Ionicons name="time-outline" size={16} color="#757575" />
          <Text style={styles.waitingText}>Waiting for buyer to confirm</Text>
        </View>
      ) : delivery.status === "IN_TRANSIT" ? (
        <TouchableOpacity
          style={[styles.actionBtn, busy && styles.btnDisabled]}
          onPress={onMarkDelivered}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={THEME.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-done-outline" size={16} color={THEME.white} />
              <Text style={styles.actionBtnText}>Mark delivered</Text>
            </>
          )}
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
  cardBusy: { opacity: 0.7 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  routeRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  routeText: { flexShrink: 1, fontSize: 14, fontWeight: "700", color: THEME.deepGreen },
  routeArrow: { flexShrink: 0 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  detailText: { fontSize: 13, color: "#616161", marginTop: 8 },
  feeText: { fontSize: 16, fontWeight: "700", color: THEME.accent, marginTop: 6 },

  actionBtn: {
    marginTop: 12,
    backgroundColor: THEME.accent,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: THEME.white },
  btnDisabled: { opacity: 0.65 },

  waitingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  waitingText: { fontSize: 13, fontWeight: "600", color: "#757575" },
});
