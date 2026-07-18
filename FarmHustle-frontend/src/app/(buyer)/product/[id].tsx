import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import {
  getProducts,
  getActiveOrderProductIds,
  createOrder,
  Product,
} from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { THEME } from "../../../theme/theme";

const { colors } = THEME;
const HAIRLINE = "#EEEEEE";
const PLACEHOLDER_BG = "#F2F4F2";

const cardShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} as const;

const categoryLabel = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export default function ProductDetail() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [activeOrderProductIds, setActiveOrderProductIds] = useState<Set<string>>(new Set());
  const hasActiveOrder = typeof id === "string" && activeOrderProductIds.has(id);

  useEffect(() => {
    getProducts()
      .then((list) => {
        const found = list.find((p) => p.id === id);
        if (found) setProduct(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const refreshActiveOrders = useCallback(async () => {
    if (!user) {
      setActiveOrderProductIds(new Set());
      return;
    }
    try {
      const ids = await getActiveOrderProductIds(user.id);
      setActiveOrderProductIds(ids);
    } catch {
      // silently fail — Buy button stays as the fallback UI
    }
  }, [user]);

  useEffect(() => {
    refreshActiveOrders();
  }, [refreshActiveOrders]);

  async function handleBuyListing() {
    if (!product) return;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to place an order.");
      return;
    }
    if (hasActiveOrder) return;
    setOrdering(true);
    try {
      const quantity = product.quantityAvailable;
      const initialPrice = product.price * quantity;
      await createOrder({
        buyerId: user.id,
        farmerId: product.farmer.id,
        productId: product.id,
        quantity,
        initialPrice,
      });
      // Reflect the order we just placed immediately, so the button can't
      // be tapped again before a fresh fetch would otherwise catch it.
      setActiveOrderProductIds((prev) => new Set(prev).add(product.id));
      Alert.alert("Order placed", `Your order for ${product.name} has been placed.`);
    } catch (err: unknown) {
      Alert.alert(
        "Order failed",
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setOrdering(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (notFound || !product) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <Ionicons name="alert-circle-outline" size={40} color="#9E9E9E" />
        <Text style={styles.notFoundText}>Product not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero image with floating back button + gold category tag */}
        <View style={styles.heroWrap}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel={`Photo of ${product.name}`}
            />
          ) : (
            <View style={[styles.heroImage, styles.imagePlaceholder]}>
              <Ionicons name="leaf-outline" size={64} color="#C4CDC6" />
            </View>
          )}

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{categoryLabel(product.category)}</Text>
          </View>
        </View>

        {/* Content sheet overlapping the hero */}
        <View style={styles.sheet}>
          <Text style={styles.productName}>{product.name}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>GHS {product.price}</Text>
            <Text style={styles.priceUnit}> / {product.unit}</Text>
          </View>

          {/* Quantity */}
          <View style={styles.metaRow}>
            <Ionicons name="cube-outline" size={16} color={colors.primary} />
            <Text style={styles.metaText}>
              {product.quantityAvailable} {product.unit} available
            </Text>
          </View>

          {/* Description */}
          {product.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          ) : null}

          {/* Farmer */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Farmer</Text>
            <View style={styles.farmerCard}>
              <FarmerRow icon="person-outline" value={product.farmer.name} />
              <FarmerRow icon="location-outline" value={product.farmer.city} />
              <FarmerRow
                icon="call-outline"
                value={product.farmer.phone}
                onPress={
                  product.farmer.phone
                    ? () => Linking.openURL(`tel:${product.farmer.phone}`)
                    : undefined
                }
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Buy button pinned at bottom */}
      <View style={styles.bottomBar}>
        {hasActiveOrder ? (
          <View style={styles.orderedBtn}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.textMuted} />
            <Text style={styles.orderedBtnText}>Already ordered</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.buyBtn, ordering && styles.buyBtnDisabled]}
            onPress={handleBuyListing}
            disabled={ordering}
            activeOpacity={0.85}
          >
            {ordering ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={20} color={colors.white} />
                <Text style={styles.buyBtnText}>Buy this listing</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function FarmerRow({
  icon,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.farmerRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.farmerValue, onPress && styles.farmerValueLink]}>{value}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    gap: 12,
  },

  scroll: { paddingBottom: 24 },

  // Hero
  heroWrap: { position: "relative" },
  heroImage: {
    height: 280,
    width: "100%",
    backgroundColor: PLACEHOLDER_BG,
  },
  imagePlaceholder: { justifyContent: "center", alignItems: "center" },
  backBtn: {
    position: "absolute",
    top: 12,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    ...cardShadow,
  },
  categoryTag: {
    position: "absolute",
    top: 18,
    right: 16,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accentText,
    letterSpacing: 0.3,
  },

  // Content sheet
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  productName: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },

  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 10 },
  priceText: { fontSize: 24, fontWeight: "800", color: colors.primary },
  priceUnit: { fontSize: 14, fontWeight: "600", color: colors.textMuted },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  metaText: { fontSize: 14, color: colors.textMuted },

  section: { paddingTop: 24 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
  },
  descriptionText: { fontSize: 14, color: "#424242", lineHeight: 21 },

  farmerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HAIRLINE,
    padding: 14,
    gap: 12,
    ...cardShadow,
  },
  farmerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  farmerValue: { fontSize: 14, color: colors.text },
  farmerValueLink: { color: colors.primary, fontWeight: "600" },

  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: HAIRLINE,
    backgroundColor: colors.bg,
  },
  buyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  buyBtnDisabled: { opacity: 0.65 },
  buyBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },

  orderedBtn: {
    backgroundColor: "#EDEDED",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  orderedBtnText: { fontSize: 16, fontWeight: "700", color: colors.textMuted },

  notFoundText: { fontSize: 16, color: "#757575" },
  backLink: { fontSize: 14, color: colors.primary, fontWeight: "600" },
});
