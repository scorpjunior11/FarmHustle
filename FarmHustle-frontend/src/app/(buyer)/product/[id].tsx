import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import {
  getProducts,
  createOrder,
  TEMP_TEST_BUYER_ID,
  Product,
} from "../../../api/client";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  bgLight: "#F4F7F5",
};

const CATEGORY_BG: Record<string, string> = {
  GRAINS: "#FFF8E1",
  VEGETABLES: "#E8F5E9",
  FRUITS: "#FCE4EC",
  TUBERS: "#FFF3E0",
  OTHER: "#F3E5F5",
};

const CATEGORY_FG: Record<string, string> = {
  GRAINS: "#F57F17",
  VEGETABLES: "#2E7D32",
  FRUITS: "#C62828",
  TUBERS: "#E65100",
  OTHER: "#6A1B9A",
};

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ordering, setOrdering] = useState(false);

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

  async function handleBuyListing() {
    if (!product) return;
    setOrdering(true);
    try {
      const quantity = product.quantityAvailable;
      const initialPrice = product.price * quantity;
      await createOrder({
        buyerId: TEMP_TEST_BUYER_ID,
        farmerId: product.farmer.id,
        productId: product.id,
        quantity,
        initialPrice,
      });
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
        <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />
        <ActivityIndicator size="large" color={THEME.accent} />
      </SafeAreaView>
    );
  }

  if (notFound || !product) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />
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
      <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />

      {/* Nav bar with back button */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={THEME.deepGreen} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Product Details
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Image placeholder */}
        <View style={styles.imagePlaceholder}>
          <Ionicons name="leaf" size={64} color={THEME.accent} />
        </View>

        {/* Name + category chip */}
        <View style={styles.nameRow}>
          <Text style={styles.productName}>{product.name}</Text>
          <View
            style={[
              styles.categoryChip,
              { backgroundColor: CATEGORY_BG[product.category] ?? "#F5F5F5" },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: CATEGORY_FG[product.category] ?? "#757575" },
              ]}
            >
              {product.category}
            </Text>
          </View>
        </View>

        {/* Price */}
        <Text style={styles.price}>
          GHS {product.price} / {product.unit}
        </Text>

        {/* Quantity */}
        <View style={styles.quantityRow}>
          <Ionicons name="cube-outline" size={16} color={THEME.accent} />
          <Text style={styles.quantityText}>
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

        {/* Farmer section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Farmer</Text>
          <View style={styles.farmerCard}>
            <FarmerRow icon="person-outline" value={product.farmer.name} />
            <FarmerRow icon="location-outline" value={product.farmer.region} />
            <FarmerRow icon="call-outline" value={product.farmer.phone} />
          </View>
        </View>
      </ScrollView>

      {/* Buy button pinned at bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.buyBtn, ordering && styles.buyBtnDisabled]}
          onPress={handleBuyListing}
          disabled={ordering}
          activeOpacity={0.85}
        >
          {ordering ? (
            <ActivityIndicator color={THEME.white} size="small" />
          ) : (
            <>
              <Ionicons name="cart-outline" size={20} color={THEME.white} />
              <Text style={styles.buyBtnText}>Buy this listing</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function FarmerRow({
  icon,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
}) {
  return (
    <View style={styles.farmerRow}>
      <Ionicons name={icon} size={16} color={THEME.accent} />
      <Text style={styles.farmerValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.white,
    gap: 12,
  },

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

  scroll: { paddingBottom: 24 },

  imagePlaceholder: {
    height: 220,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },

  nameRow: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  productName: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: THEME.deepGreen,
  },
  categoryChip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  categoryText: { fontSize: 12, fontWeight: "700" },

  price: {
    paddingHorizontal: 20,
    paddingTop: 8,
    fontSize: 20,
    fontWeight: "700",
    color: THEME.accent,
  },

  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 6,
    gap: 6,
  },
  quantityText: { fontSize: 14, color: "#757575" },

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.deepGreen,
    marginBottom: 8,
  },
  descriptionText: { fontSize: 14, color: "#424242", lineHeight: 21 },

  farmerCard: {
    backgroundColor: THEME.bgLight,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  farmerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  farmerValue: { fontSize: 14, color: "#212121" },

  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: "#E0E0E0",
    backgroundColor: THEME.white,
  },
  buyBtn: {
    backgroundColor: THEME.accent,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  buyBtnDisabled: { opacity: 0.65 },
  buyBtnText: { fontSize: 16, fontWeight: "700", color: THEME.white },

  notFoundText: { fontSize: 16, color: "#757575" },
  backLink: { fontSize: 14, color: THEME.accent, fontWeight: "600" },
});
