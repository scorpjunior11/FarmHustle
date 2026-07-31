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
  Modal,
  TextInput,
  Image,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getDeliveries, acceptDelivery, Delivery } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../theme/theme";
import { useLiveData } from "../../hooks/useLiveData";

const { colors } = THEME;
const HAIRLINE = "#EEEEEE";
const INPUT_BG = "#F5F6F5";
const EMPTY_CIRCLE = "#E8F3E9";

const cardShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} as const;

function formatRequestedAgo(createdAt: string): string {
  const then = new Date(createdAt).getTime();
  if (isNaN(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

export default function DeliveryJobsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [acceptingDelivery, setAcceptingDelivery] = useState<Delivery | null>(null);
  const [feeInput, setFeeInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  useLiveData(fetchDeliveries, { isActionInProgress: submitting });

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const openAcceptModal = (delivery: Delivery) => {
    setAcceptingDelivery(delivery);
    setFeeInput("");
    setFormError(null);
  };

  const closeAcceptModal = () => {
    if (!submitting) setAcceptingDelivery(null);
  };

  const handleConfirmAccept = async () => {
    if (!acceptingDelivery || !user) return;
    const fee = Number(feeInput);
    if (!feeInput.trim() || isNaN(fee) || fee <= 0) {
      setFormError("Please enter a valid fee greater than 0.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const commission = fee * 0.1;
      await acceptDelivery(acceptingDelivery.id, user.id, fee, commission);
      setDeliveries((prev) => prev.filter((d) => d.id !== acceptingDelivery.id));
      setAcceptingDelivery(null);
      Alert.alert("Job accepted", "This delivery has been added to your jobs.");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      setFormError(raw.replace(/^\d{3}:\s*/, ""));
    } finally {
      setSubmitting(false);
    }
  };

  const openJobs = deliveries.filter((d) => d.status === "REQUESTED");

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
          <Text style={styles.bannerTitle}>Available Jobs</Text>
        </View>
        <View style={styles.body}>
          <EmptyState
            icon="log-in-outline"
            title="Please log in"
            subtitle="Log in to see delivery jobs available near you."
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
        <Text style={styles.bannerTitle}>Available Jobs</Text>
        <Text style={styles.bannerSubtitle}>Accept delivery requests near you</Text>
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={openJobs}
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
                icon="cube-outline"
                title="No jobs available yet"
                subtitle="New delivery requests will show up here. Pull down to refresh."
              />
            }
            renderItem={({ item }) => (
              <JobCard delivery={item} onAccept={() => openAcceptModal(item)} />
            )}
          />
        )}
      </View>

      {/* Accept & Set Fee Modal */}
      <Modal
        visible={acceptingDelivery !== null}
        animationType="fade"
        transparent
        onRequestClose={closeAcceptModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set your delivery fee</Text>
            <View style={styles.modalRoute}>
              <Ionicons name="location-outline" size={14} color={colors.primary} />
              <Text style={styles.modalRouteText} numberOfLines={1}>
                {acceptingDelivery?.pickupLocation ?? "?"}
              </Text>
              <Ionicons name="arrow-forward" size={13} color={colors.textMuted} />
              <Text style={styles.modalRouteText} numberOfLines={1}>
                {acceptingDelivery?.deliveryLocation ?? "?"}
              </Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Fee (GHS)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={feeInput}
              onChangeText={setFeeInput}
              accessibilityLabel="Delivery fee"
              autoFocus
            />
            <Text style={styles.helperText}>
              Platform commission (10%) is deducted from this fee.
            </Text>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeAcceptModal}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submitting && styles.btnDisabled]}
                onPress={handleConfirmAccept}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function JobCard({
  delivery,
  onAccept,
}: {
  delivery: Delivery;
  onAccept: () => void;
}) {
  const order = delivery.order;
  const orderValue = order ? order.agreedPrice ?? order.initialPrice : null;

  return (
    <View style={styles.card}>
      {/* Requested-when */}
      <View style={styles.metaTopRow}>
        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
        <Text style={styles.requestedText}>Requested {formatRequestedAgo(delivery.createdAt)}</Text>
      </View>

      {/* Route — stacked pickup/drop-off, clearly labelled */}
      <View style={styles.routeBlock}>
        <View style={styles.routeStopRow}>
          <View style={[styles.routeDot, styles.routeDotPickup]} />
          <Text style={styles.routeLabel}>Pickup</Text>
        </View>
        <Text style={styles.routeText} numberOfLines={1}>
          {delivery.pickupLocation ?? "Unknown"}
        </Text>

        <View style={styles.routeConnector} />

        <View style={styles.routeStopRow}>
          <View style={[styles.routeDot, styles.routeDotDrop]} />
          <Text style={styles.routeLabel}>Drop-off</Text>
        </View>
        <Text style={styles.routeText} numberOfLines={1}>
          {delivery.deliveryLocation ?? "Unknown"}
        </Text>
      </View>

      {order ? (
        <>
          <View style={styles.divider} />

          {/* Product + order value */}
          <View style={styles.productRow}>
            {order.product?.imageUrl ? (
              <Image
                source={{ uri: order.product.imageUrl }}
                style={styles.productThumb}
                resizeMode="cover"
                accessibilityLabel={`Photo of ${order.product?.name ?? "product"}`}
              />
            ) : (
              <View style={[styles.productThumb, styles.productThumbPlaceholder]}>
                <Ionicons name="leaf-outline" size={20} color="#C4CDC6" />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {order.product?.name ?? "Unknown product"}
              </Text>
              <Text style={styles.productMeta}>
                {order.quantity} {order.product?.unit ?? ""}
              </Text>
            </View>
            {orderValue != null ? (
              <View style={styles.valueBlock}>
                <Text style={styles.valueLabel}>Order value</Text>
                <Text style={styles.valueAmount}>GHS {orderValue.toFixed(2)}</Text>
              </View>
            ) : null}
          </View>

          {/* Buyer */}
          <View style={styles.personRow}>
            <Ionicons name="person-outline" size={13} color={colors.textMuted} />
            <Text style={styles.personText} numberOfLines={1}>
              <Text style={styles.personLabel}>Buyer  </Text>
              {order.buyer?.name ?? "Unknown buyer"}
            </Text>
          </View>
          {order.buyer?.phone ? (
            <TouchableOpacity
              style={styles.callRow}
              onPress={() => Linking.openURL(`tel:${order.buyer!.phone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={13} color={colors.primary} />
              <Text style={styles.callText}>{order.buyer.phone}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Farmer */}
          <View style={styles.personRow}>
            <Ionicons name="leaf-outline" size={13} color={colors.textMuted} />
            <Text style={styles.personText} numberOfLines={1}>
              <Text style={styles.personLabel}>Farmer  </Text>
              {order.farmer?.name ?? "Unknown farmer"}
            </Text>
          </View>
          {order.farmer?.phone ? (
            <TouchableOpacity
              style={styles.callRow}
              onPress={() => Linking.openURL(`tel:${order.farmer!.phone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={13} color={colors.primary} />
              <Text style={styles.callText}>{order.farmer.phone}</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : (
        <View style={styles.standaloneTag}>
          <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
          <Text style={styles.standaloneTagText}>Standalone delivery</Text>
        </View>
      )}

      <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
        <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
        <Text style={styles.acceptBtnText}>Accept &amp; set fee</Text>
      </TouchableOpacity>
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

  metaTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  requestedText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },

  // Route — stacked pickup/drop-off, the card's headline
  routeBlock: { marginTop: 8 },
  routeStopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeDotPickup: { backgroundColor: colors.primary },
  routeDotDrop: { backgroundColor: colors.accent },
  routeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  routeText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginLeft: 14,
    marginTop: 2,
  },
  routeConnector: {
    width: 1.5,
    height: 14,
    backgroundColor: HAIRLINE,
    marginLeft: 3.25,
    marginVertical: 4,
  },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: HAIRLINE, marginVertical: 14 },

  // Product + order value
  productRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  productThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#F2F4F2" },
  productThumbPlaceholder: { justifyContent: "center", alignItems: "center" },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { fontSize: 14, fontWeight: "700", color: colors.text },
  productMeta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  valueBlock: { alignItems: "flex-end" },
  valueLabel: { fontSize: 10.5, color: colors.textMuted, fontWeight: "600" },
  valueAmount: { fontSize: 16, fontWeight: "800", color: colors.primary, marginTop: 1 },

  // Buyer / farmer
  personRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  personText: { flex: 1, fontSize: 13, color: colors.text },
  personLabel: { color: colors.textMuted, fontWeight: "700" },
  callRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, marginLeft: 19 },
  callText: { fontSize: 12.5, color: colors.primary, fontWeight: "600" },

  standaloneTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F6F5",
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 14,
  },
  standaloneTagText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },

  acceptBtn: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  acceptBtnText: { fontSize: 13, fontWeight: "700", color: colors.white },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 22,
    width: "100%",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalRoute: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 16 },
  modalRouteText: { flexShrink: 1, fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  input: {
    borderWidth: 1.5,
    borderColor: HAIRLINE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: INPUT_BG,
  },
  helperText: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  errorText: { fontSize: 13, color: colors.danger, marginTop: 10 },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: HAIRLINE,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: colors.text },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },
  btnDisabled: { opacity: 0.65 },
});
