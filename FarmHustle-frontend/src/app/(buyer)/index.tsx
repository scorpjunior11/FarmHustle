
import React, { useState, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getProducts, Product } from "../../api/client";

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
        source={LOCAL_IMAGES[imageKey]}
        style={styles.cropImage}
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
          <Text style={styles.locationText}>{item.farmer.region}</Text>
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

  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.farmer.name.toLowerCase().includes(search.toLowerCase()) ||
      p.farmer.region.toLowerCase().includes(search.toLowerCase())
  );

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
        <TouchableOpacity>
          <Ionicons name="person-circle-outline" size={28} color="#424242" />
        </TouchableOpacity>

        <Text style={styles.logo}>
          FarmHustle <Text style={styles.logoLeaf}>🌿</Text>
        </Text>

        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={26} color="#424242" />
        </TouchableOpacity>
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
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="filter-outline" size={20} color="#2E7D32" />
        </TouchableOpacity>
      </View>

      {/* ── Crop List ── */}
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
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={48} color="#C8E6C9" />
            <Text style={styles.emptyText}>No crops match your search.</Text>
          </View>
        }
      />
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
    justifyContent: "space-between",
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
  filterBtn: {
    backgroundColor: "#E8F5E9",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
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
