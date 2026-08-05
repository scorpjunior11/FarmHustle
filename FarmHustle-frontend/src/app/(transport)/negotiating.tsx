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
import {
  getDeliveries,
  getMyNegotiationOffers,
  proposeNegotiationOffer,
  acceptBuyerPrice,
  counterOfferAsDriver,
  declineNegotiationOffer,
  Delivery,
  DriverOfferSummary,
} from "../../api/client";
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

// A request the driver hasn't yet permanently walked away from — either they
// haven't engaged yet (myOffer === null), or their offer is still PENDING, or
// it's DECLINED/CLOSED (kept visible briefly so the outcome is legible before
// it drops off the next poll). ACCEPTED offers move the delivery out of
// REQUESTED entirely, so they never appear here — they surface on Active
// exactly like an old-flow accepted job, with zero changes to that screen.
type NegotiableJob = {
  delivery: Delivery;
  myOffer: DriverOfferSummary | null;
};

export default function NegotiatingScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<NegotiableJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const [counterTarget, setCounterTarget] = useState<NegotiableJob | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterSubmitting, setCounterSubmitting] = useState(false);
  const [counterError, setCounterError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [deliveries, myOffers] = await Promise.all([
        getDeliveries(),
        getMyNegotiationOffers(),
      ]);
      const myOffersByRequestId = Object.fromEntries(myOffers.map((o) => [o.requestId, o]));
      const openJobs = deliveries
        .filter((d) => d.status === "REQUESTED")
        .map((delivery) => ({ delivery, myOffer: myOffersByRequestId[delivery.id] ?? null }));
      setJobs(openJobs);
    } catch {
      // silently fail — list stays as-is
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useLiveData(fetchData, { isActionInProgress: busyRequestId !== null || counterSubmitting });

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAcceptPrice = async (job: NegotiableJob) => {
    setBusyRequestId(job.delivery.id);
    try {
      await acceptBuyerPrice(job.delivery.id);
      await fetchData();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Could not accept", raw.replace(/^\d{3}:\s*/, ""));
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleDeclineOffer = (job: NegotiableJob) => {
    if (!job.myOffer) {
      // No offer exists yet — nothing to decline server-side, this is just
      // "not interested." Hide it locally for this session.
      setDismissedIds((prev) => new Set(prev).add(job.delivery.id));
      return;
    }
    const offerId = job.myOffer.offerId;
    Alert.alert("Decline this request?", "You won't be able to negotiate on it again.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          setBusyRequestId(job.delivery.id);
          try {
            await declineNegotiationOffer(offerId);
            await fetchData();
          } catch (err) {
            const raw = err instanceof Error ? err.message : "Something went wrong.";
            Alert.alert("Could not decline", raw.replace(/^\d{3}:\s*/, ""));
          } finally {
            setBusyRequestId(null);
          }
        },
      },
    ]);
  };

  const openCounterModal = (job: NegotiableJob) => {
    setCounterTarget(job);
    setCounterAmount("");
    setCounterError(null);
  };

  const closeCounterModal = () => {
    if (!counterSubmitting) setCounterTarget(null);
  };

  const handleSubmitCounter = async () => {
    if (!counterTarget) return;
    const amount = Number(counterAmount);
    if (!counterAmount.trim() || isNaN(amount) || amount <= 0) {
      setCounterError("Please enter a valid amount greater than 0.");
      return;
    }
    setCounterSubmitting(true);
    setCounterError(null);
    try {
      if (counterTarget.myOffer) {
        await counterOfferAsDriver(counterTarget.myOffer.offerId, amount);
      } else {
        await proposeNegotiationOffer(counterTarget.delivery.id, amount);
      }
      setCounterTarget(null);
      await fetchData();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      setCounterError(raw.replace(/^\d{3}:\s*/, ""));
    } finally {
      setCounterSubmitting(false);
    }
  };

  const visibleJobs = jobs.filter((j) => !dismissedIds.has(j.delivery.id));

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
          <Text style={styles.bannerTitle}>Negotiate</Text>
        </View>
        <View style={styles.body}>
          <EmptyState
            icon="log-in-outline"
            title="Please log in"
            subtitle="Log in to negotiate delivery fees with buyers."
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
        <Text style={styles.bannerTitle}>Negotiate</Text>
        <Text style={styles.bannerSubtitle}>Accept, counter, or decline a buyer's price</Text>
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={visibleJobs}
            keyExtractor={(item) => item.delivery.id}
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
                icon="chatbubbles-outline"
                title="Nothing to negotiate"
                subtitle="Open requests with a buyer's starting price will show up here."
              />
            }
            renderItem={({ item }) => (
              <NegotiationCard
                job={item}
                busy={busyRequestId === item.delivery.id}
                onAcceptPrice={() => handleAcceptPrice(item)}
                onCounter={() => openCounterModal(item)}
                onDecline={() => handleDeclineOffer(item)}
              />
            )}
          />
        )}
      </View>

      {/* Counter / propose a fee */}
      <Modal
        visible={counterTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={closeCounterModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {counterTarget?.myOffer ? "Counter this request" : "Propose your fee"}
            </Text>
            <View style={styles.modalRoute}>
              <Ionicons name="location-outline" size={14} color={colors.primary} />
              <Text style={styles.modalRouteText} numberOfLines={1}>
                {counterTarget?.delivery.pickupLocation ?? "?"}
              </Text>
              <Ionicons name="arrow-forward" size={13} color={colors.textMuted} />
              <Text style={styles.modalRouteText} numberOfLines={1}>
                {counterTarget?.delivery.deliveryLocation ?? "?"}
              </Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Fee (GHS)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={counterAmount}
              onChangeText={setCounterAmount}
              accessibilityLabel="Your fee"
              autoFocus
            />

            {counterError ? <Text style={styles.errorText}>{counterError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeCounterModal}
                disabled={counterSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, counterSubmitting && styles.btnDisabled]}
                onPress={handleSubmitCounter}
                disabled={counterSubmitting}
                activeOpacity={0.85}
              >
                {counterSubmitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NegotiationCard({
  job,
  busy,
  onAcceptPrice,
  onCounter,
  onDecline,
}: {
  job: NegotiableJob;
  busy: boolean;
  onAcceptPrice: () => void;
  onCounter: () => void;
  onDecline: () => void;
}) {
  const { delivery, myOffer } = job;
  const order = delivery.order;
  const orderValue = order ? order.agreedPrice ?? order.initialPrice : null;
  const isTerminal = myOffer !== null && (myOffer.status === "DECLINED" || myOffer.status === "CLOSED");
  const canAct = myOffer === null || myOffer.status === "PENDING";

  return (
    <View style={styles.card}>
      <View style={styles.metaTopRow}>
        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
        <Text style={styles.requestedText}>Requested {formatRequestedAgo(delivery.createdAt)}</Text>
      </View>

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
        </>
      ) : (
        <View style={styles.standaloneTag}>
          <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
          <Text style={styles.standaloneTagText}>Standalone delivery</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>
          {myOffer ? "Current amount" : "Buyer's starting fee"}
        </Text>
        <Text style={styles.priceValue}>
          GHS {myOffer ? myOffer.currentAmount : delivery.deliveryFee ?? 0}
        </Text>
      </View>

      {myOffer ? (
        <Text style={styles.turnText}>
          {isTerminal
            ? myOffer.status === "DECLINED"
              ? "You declined this request"
              : "The buyer chose another driver"
            : myOffer.lastActor === "BUYER"
            ? "Your turn to respond"
            : "Waiting for the buyer"}
        </Text>
      ) : null}

      {canAct ? (
        <>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.counterBtn, busy && styles.btnDisabled]}
              onPress={onCounter}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.counterBtnText}>Counter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptPriceBtn, busy && styles.btnDisabled]}
              onPress={onAcceptPrice}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={16} color={colors.white} />
                  <Text style={styles.acceptPriceBtnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.declineLink}
            onPress={onDecline}
            disabled={busy}
            activeOpacity={0.7}
          >
            <Text style={styles.declineLinkText}>Decline</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  body: { flex: 1, backgroundColor: colors.bg },

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

  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },

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
  routeText: { fontSize: 16, fontWeight: "800", color: colors.text, marginLeft: 14, marginTop: 2 },
  routeConnector: { width: 1.5, height: 14, backgroundColor: HAIRLINE, marginLeft: 3.25, marginVertical: 4 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: HAIRLINE, marginVertical: 14 },

  productRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  productThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#F2F4F2" },
  productThumbPlaceholder: { justifyContent: "center", alignItems: "center" },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { fontSize: 14, fontWeight: "700", color: colors.text },
  productMeta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  valueBlock: { alignItems: "flex-end" },
  valueLabel: { fontSize: 10.5, color: colors.textMuted, fontWeight: "600" },
  valueAmount: { fontSize: 16, fontWeight: "800", color: colors.primary, marginTop: 1 },

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

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  priceLabel: { fontSize: 12.5, fontWeight: "600", color: colors.textMuted },
  priceValue: { fontSize: 16, fontWeight: "800", color: colors.primary },

  turnText: { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginTop: 10 },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  counterBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: { fontSize: 13, fontWeight: "700", color: colors.text },
  acceptPriceBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  acceptPriceBtnText: { fontSize: 13, fontWeight: "700", color: colors.white },

  declineLink: { marginTop: 10, alignSelf: "center" },
  declineLinkText: { fontSize: 12, fontWeight: "700", color: colors.danger },

  btnDisabled: { opacity: 0.65 },

  // Modal (mirrors the transport app's existing "set your fee" modal recipe)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: { backgroundColor: colors.card, borderRadius: 20, padding: 22, width: "100%" },
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
});
