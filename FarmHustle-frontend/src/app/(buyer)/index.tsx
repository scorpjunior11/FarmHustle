
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
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getActiveProducts, Product } from "../../api/client";
import { THEME } from "../../theme/theme";

const { colors } = THEME;

const HAIRLINE = "#EEEEEE";
const PLACEHOLDER_BG = "#F2F4F2";
const IMAGE_HEIGHT = 120;
const GUTTER = 14;
const SIDE = 16;

// Card shadow (subtle, paired with a hairline border).
const cardShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} as const;

// Category values match Product["category"] in client.ts. Icons chosen to look
// intentional & consistent (all verified against Ionicons.glyphMap via the typed key).
type CategoryItem = {
  value: Product["category"] | null;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const CATEGORY_ITEMS: CategoryItem[] = [
  { value: null, icon: "grid-outline", label: "All" },
  { value: "GRAINS", icon: "flower-outline", label: "Grains" },
  { value: "VEGETABLES", icon: "leaf-outline", label: "Vegetables" },
  { value: "FRUITS", icon: "nutrition-outline", label: "Fruits" },
  { value: "TUBERS", icon: "earth-outline", label: "Tubers" },
  { value: "OTHER", icon: "apps-outline", label: "Other" },
];

const categoryLabel = (value: Product["category"]) =>
  value.charAt(0) + value.slice(1).toLowerCase();

// ─── Product Card ─────────────────────────────────────────────────────────────
const CropCard = ({
  item,
  liked,
  onToggleLike,
  onBuy,
}: {
  item: Product;
  liked: boolean;
  onToggleLike: (id: string) => void;
  onBuy: (item: Product) => void;
}) => (
  <View style={styles.card}>
    {/* Image / placeholder */}
    <View style={styles.imageWrap}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cropImage}
          resizeMode="cover"
          accessibilityLabel={`Photo of ${item.name}`}
        />
      ) : (
        <View style={[styles.cropImage, styles.imagePlaceholder]}>
          <Ionicons name="leaf-outline" size={30} color="#C4CDC6" />
        </View>
      )}

      {/* Gold category tag (top-left) */}
      <View style={styles.categoryTag}>
        <Text style={styles.categoryTagText}>{categoryLabel(item.category)}</Text>
      </View>

      {/* Favorite heart (top-right) */}
      <TouchableOpacity
        style={styles.heartBtn}
        onPress={() => onToggleLike(item.id)}
        accessibilityLabel={liked ? "Unfavorite" : "Favorite"}
      >
        <Ionicons name={liked ? "heart" : "heart-outline"} size={16} color={liked ? "#E53935" : "#8A948D"} />
      </TouchableOpacity>
    </View>

    {/* Body */}
    <View style={styles.cardBody}>
      <Text style={styles.cropName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.farmerName} numberOfLines={1}>
        Farmer: {item.farmer.name}
      </Text>

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={12} color={colors.textMuted} />
        <Text style={styles.metaText} numberOfLines={1}>
          {item.farmer.city}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="cube-outline" size={12} color={colors.textMuted} />
        <Text style={styles.metaText} numberOfLines={1}>
          {item.quantityAvailable} {item.unit}
        </Text>
      </View>

      {/* Price */}
      <View style={styles.priceBlock}>
        <Text style={styles.priceText}>GHS {item.price}</Text>
        <Text style={styles.priceUnit}> / {item.unit}</Text>
      </View>

      {/* Buy */}
      <TouchableOpacity style={styles.buyButton} onPress={() => onBuy(item)} activeOpacity={0.85}>
        <Ionicons name="cart-outline" size={15} color={colors.white} />
        <Text style={styles.buyButtonText}>Buy</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BuyerHome() {
  const insets = useSafeAreaInsets();
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
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <CropCard
            item={item}
            liked={!!likedMap[item.id]}
            onToggleLike={toggleLike}
            onBuy={handleBuy}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 68 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* ── Green header banner ── */}
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
              <Text style={styles.greeting}>Fresh from local farms</Text>
            </View>

            {/* Floating search bar overlapping the banner */}
            <View style={styles.searchWrap}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search crops, farmers, locations..."
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>

            {/* Category chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORY_ITEMS.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                    onPress={() => setSelectedCategory(cat.value)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={16}
                      color={isSelected ? colors.white : colors.primary}
                    />
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Available Crops</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
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
          )
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary, // green fills the top safe-area inset
  },

  listContent: {
    backgroundColor: colors.bg,
    paddingBottom: 24,
  },

  // Green banner
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: SIDE,
    paddingTop: 8,
    paddingBottom: 44,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  wordmark: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.2,
  },
  wordmarkAccent: { color: colors.accent },
  greeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 10,
  },

  // Floating search
  searchWrap: {
    paddingHorizontal: SIDE,
    marginTop: -26,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
    ...cardShadow,
    shadowOpacity: 0.1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },

  // Category chips
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: SIDE,
    paddingTop: 18,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
  },
  chipUnselected: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: HAIRLINE,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  chipLabelSelected: { color: colors.white },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    paddingHorizontal: SIDE,
    paddingTop: 16,
    paddingBottom: 12,
  },

  // Grid
  columnWrapper: {
    paddingHorizontal: SIDE,
    gap: GUTTER,
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HAIRLINE,
    marginBottom: GUTTER,
    ...cardShadow,
  },
  imageWrap: { position: "relative" },
  cropImage: {
    width: "100%",
    height: IMAGE_HEIGHT,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  imagePlaceholder: {
    backgroundColor: PLACEHOLDER_BG,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryTag: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accentText,
    letterSpacing: 0.3,
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { padding: 10 },
  cropName: { fontSize: 14, fontWeight: "700", color: colors.text },
  farmerName: { fontSize: 11, fontWeight: "600", color: colors.primary, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  metaText: { flex: 1, fontSize: 11, color: colors.textMuted },

  priceBlock: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  priceText: { fontSize: 15, fontWeight: "800", color: colors.primary },
  priceUnit: { fontSize: 11, fontWeight: "600", color: colors.textMuted },

  buyButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 34,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  buyButtonText: { color: colors.white, fontSize: 13, fontWeight: "700" },

  // Empty / loading
  emptyState: { alignItems: "center", paddingTop: 70, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});
