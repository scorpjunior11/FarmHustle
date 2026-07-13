
import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getActiveProducts, Product } from "../../api/client";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
};

// Same category values as Product["category"] in client.ts / the Add Product form's CATEGORIES.
type CategoryItem = {
  value: Product["category"] | null;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const CATEGORY_ITEMS: CategoryItem[] = [
  { value: null, icon: "apps-outline", label: "All" },
  { value: "GRAINS", icon: "nutrition-outline", label: "Grains" },
  { value: "VEGETABLES", icon: "leaf-outline", label: "Vegetables" },
  { value: "FRUITS", icon: "flower-outline", label: "Fruits" },
  { value: "TUBERS", icon: "server-outline", label: "Tubers" },
  { value: "OTHER", icon: "ellipsis-horizontal-circle-outline", label: "Other" },
];

// ─── Local Images (same files used by the farmer screen) ───────────────────────
const LOCAL_IMAGES: Record<string, ImageSourcePropType> = {
  maize: require("../../../assets/images/Maize.jpg"),
  tomatoes: require("../../../assets/images/Tomatoes.jpg"),
  yam: require("../../../assets/images/Yam.jpg"),
  plantain: require("../../../assets/images/Plantain.jpg"),
};

// ─── CropCard Component ───────────────────────────────────────────────────────
const CropCard = ({
  item,
  imageKey,
  liked,
  onToggleLike,
  onBuy,
}: {
  item: Product;
  imageKey: string;
  liked: boolean;
  onToggleLike: (id: string) => void;
  onBuy: (item: Product) => void;
}) => (
  <View style={styles.card}>
    <View style={styles.cardTop}>
      <Image
        source={item.imageUrl ? { uri: item.imageUrl } : LOCAL_IMAGES[imageKey]}
        style={styles.cropImage}
        resizeMode="cover"
        accessibilityLabel={`Photo of ${item.name}`}
      />

      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.cropName}>{item.name}</Text>
          <TouchableOpacity onPress={() => onToggleLike(item.id)}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color={liked ? "#E53935" : "#9E9E9E"}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.farmerName}>Farmer: {item.farmer.name}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color="#757575" />
          <Text style={styles.locationText}>{item.farmer.city}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="cube-outline" size={13} color="#757575" />
            <Text style={styles.statLabel}>{item.quantityAvailable} {item.unit}</Text>
          </View>
          <Text style={styles.statLabel}>Available</Text>
        </View>
      </View>
    </View>

    <TouchableOpacity style={styles.buyButton} onPress={() => onBuy(item)}>
      <Ionicons name="cart-outline" size={16} color="#FFFFFF" />
      <Text style={styles.buyButtonText}>Buy Now</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BuyerHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Product["category"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await getActiveProducts();
      setProducts(data);
    } catch {
      // silently fail — list stays as-is
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.farmer.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.farmer?.city ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleLike = (id: string) =>
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleBuy = (item: Product) => {
    router.push({ pathname: "/product/[id]", params: { id: item.id } });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          FarmHustle <Text style={styles.logoLeaf}>🌿</Text>
        </Text>
      </View>

      {/* ── Page title ── */}
      <View style={styles.titleBlock}>
        <Text style={styles.pageTitle}>Available Crops</Text>
        <Text style={styles.pageSubtitle}>Find quality produce from farmers</Text>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9E9E9E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crops, farmers, locations..."
            placeholderTextColor="#BDBDBD"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* ── Category filter ── */}
      <View style={styles.categoryCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORY_ITEMS.map((item) => {
            const isSelected = selectedCategory === item.value;
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                onPress={() => setSelectedCategory(item.value)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={isSelected ? THEME.white : THEME.accent}
                />
                <Text
                  style={[
                    styles.categoryItemLabel,
                    isSelected && styles.categoryItemLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Crop List ── */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : (
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CropCard
            item={item}
            imageKey={item.name.toLowerCase()}
            liked={!!likedMap[item.id]}
            onToggleLike={toggleLike}
            onBuy={handleBuy}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2E7D32"]}
            tintColor="#2E7D32"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={48} color="#C8E6C9" />
            <Text style={styles.emptyText}>
              {selectedCategory
                ? `No crops in ${
                    CATEGORY_ITEMS.find((c) => c.value === selectedCategory)?.label ?? "this category"
                  } right now.`
                : "No crops available yet."}
            </Text>
          </View>
        }
      />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
  },
  logo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2E7D32",
    letterSpacing: 0.3,
  },
  logoLeaf: {
    fontSize: 18,
  },

  // Title block
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#212121",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#757575",
    marginTop: 2,
  },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#212121",
  },

  // Category filter
  categoryCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
    gap: 10,
  },
  categoryItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "transparent",
  },
  categoryItemSelected: {
    backgroundColor: THEME.accent,
  },
  categoryItemLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.deepGreen,
    marginTop: 4,
  },
  categoryItemLabelSelected: {
    color: THEME.white,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  cropImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cropName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212121",
  },
  farmerName: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: "600",
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: "#757575",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statLabel: {
    fontSize: 12,
    color: "#757575",
  },
  priceBlock: {
    marginLeft: "auto",
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121",
  },

  // Buy button
  buyButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    color: "#9E9E9E",
    fontSize: 14,
  },
});
