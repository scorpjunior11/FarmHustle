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
  Linking,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getDeliveries,
  updateDeliveryStatus,
  confirmDeliveryByProvider,
  Delivery,
  DeliveryStatus,
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../theme/theme";
import { useLiveData } from "../../hooks/useLiveData";

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

const STATUS_META: Partial<Record<DeliveryStatus, { label: string; bg: string; fg: string }>> = {
  FEE_PROPOSED: { label: "Awaiting buyer", bg: "#F3E5F5", fg: "#6A1B9A" },
  ACCEPTED: { label: "Accepted", bg: "#FFF8E1", fg: "#F57F17" },
  IN_TRANSIT: { label: "In transit", bg: "#E3F2FD", fg: "#1565C0" },
};

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyCircle}>
        <Ionicons name={icon} size={40} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );
}

export default function ActiveDeliveriesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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

  useLiveData(fetchDeliveries, { isActionInProgress: actingDeliveryId !== null });

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
          <Text style={styles.bannerTitle}>Active Deliveries</Text>
        </View>
        <View style={styles.body}>
          <EmptyState
            icon="log-in-outline"
            title="Please log in"
            subtitle="Log in to track and complete your active deliveries."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
        <Text style={styles.bannerTitle}>Active Deliveries</Text>
        <Text style={styles.bannerSubtitle}>Track and complete your jobs</Text>
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={activeJobs}
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
              <EmptyState
                icon="car-outline"
                title="No active deliveries"
                subtitle="Jobs you accept will appear here to track and complete."
              />
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
      </View>
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
          <Ionicons name="location-outline" size={15} color={colors.primary} />
          <Text style={styles.routeText} numberOfLines={1}>
            {delivery.pickupLocation ?? "Unknown"}
          </Text>
          <Ionicons name="arrow-forward" size={15} color={colors.textMuted} style={styles.routeArrow} />
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

      <View style={styles.detailRow}>
        <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
        {order ? (
          <Text style={styles.detailText} numberOfLines={2}>
            {order.product?.name ?? "Unknown product"} · {order.quantity}{" "}
            {order.product?.unit ?? ""} for {order.buyer?.name ?? "Unknown buyer"}
          </Text>
        ) : (
          <Text style={styles.detailText}>Standalone delivery</Text>
        )}
      </View>

      {order?.buyer?.phone ? (
        <TouchableOpacity
          style={styles.callRow}
          onPress={() => Linking.openURL(`tel:${order.buyer!.phone}`)}
          activeOpacity={0.7}
        >
          <Ionicons name="call-outline" size={14} color={colors.primary} />
          <Text style={styles.callText}>{order.buyer.phone}</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.feeText}>GHS {delivery.deliveryFee ?? "0"}</Text>

      {delivery.status === "FEE_PROPOSED" ? (
        <View style={styles.waitingRow}>
          <Ionicons name="hourglass-outline" size={16} color={colors.textMuted} />
          <Text style={styles.waitingText}>Waiting for buyer to accept fee</Text>
        </View>
      ) : delivery.status === "ACCEPTED" ? (
        delivery.feePaid ? (
          <TouchableOpacity
            style={[styles.actionBtn, busy && styles.btnDisabled]}
            onPress={onStart}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="play-outline" size={16} color={colors.white} />
                <Text style={styles.actionBtnText}>Start delivery</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.waitingRow}>
              <Ionicons name="hourglass-outline" size={16} color={colors.textMuted} />
              <Text style={styles.waitingText}>Awaiting buyer payment</Text>
            </View>
            <Text style={styles.waitingSubtext}>
              You can start the delivery once the buyer pays the fee.
            </Text>
          </>
        )
      ) : waitingForBuyer ? (
        <View style={styles.waitingRow}>
          <Ionicons name="hourglass-outline" size={16} color={colors.textMuted} />
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
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-done-outline" size={16} color={colors.white} />
              <Text style={styles.actionBtnText}>Mark delivered</Text>
            </>
          )}
        </TouchableOpacity>
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
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  brandMark: { width: 48, height: 48, justifyContent: "center", alignItems: "center" },
  wordmark: { fontSize: 18, fontWeight: "800", color: colors.white, letterSpacing: 0.2 },
  wordmarkAccent: { color: colors.accent },
  bannerTitle: { fontSize: 22, fontWeight: "800", color: colors.white },
  bannerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },

  // Rich empty state
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
  routeRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  routeText: { flexShrink: 1, fontSize: 14, fontWeight: "800", color: colors.text },
  routeArrow: { flexShrink: 0 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10 },
  detailText: { flex: 1, fontSize: 13, color: colors.textMuted },
  callRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  callText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  feeText: { fontSize: 18, fontWeight: "800", color: colors.primary, marginTop: 8 },

  actionBtn: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: colors.white },
  btnDisabled: { opacity: 0.65 },

  waitingRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  waitingText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  waitingSubtext: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
