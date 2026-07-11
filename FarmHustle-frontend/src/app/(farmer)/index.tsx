import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Entypo } from '@expo/vector-icons';
import { createProduct, getProducts, Product } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ─── Colors ───────────────────────────────────────────────────
const C = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  white: '#FFFFFF',
  bg: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#9E9E9E',
  border: '#E0E0E0',
  badgeBg: '#E8F5E9',
  badgeText: '#2E7D32',
};

// ─── Add Product form options ─────────────────────────────────
const CATEGORIES = ['GRAINS', 'VEGETABLES', 'FRUITS', 'TUBERS', 'OTHER'] as const;
const UNITS = ['KG', 'BAG', 'CRATE', 'BUNCH'] as const;
type Category = typeof CATEGORIES[number];
type Unit = typeof UNITS[number];

// ─── Listing Card ─────────────────────────────────────────────
function ListingCard({ product }: { product: Product }) {
  return (
    <View style={cardStyles.card}>
      <Image
        source={require('../../../assets/images/icon.png')}
        style={cardStyles.image}
        accessibilityLabel={`Photo of ${product.name}`}
      />
      <View style={cardStyles.details}>
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.cropName}>{product.name}</Text>
          <View style={cardStyles.badge}>
            <Text style={cardStyles.badgeText}>{product.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
        <Text style={cardStyles.meta}>
          {product.quantityAvailable} {product.unit}  ·  {product.category}
        </Text>
        <View style={cardStyles.locationRow}>
          <MaterialIcons name="location-pin" size={13} color={C.textMuted} />
          <Text style={cardStyles.locationText}>{product.farmer.city}</Text>
        </View>
      </View>
      <TouchableOpacity style={cardStyles.menu} accessibilityLabel={`Options for ${product.name}`} accessibilityRole="button">
        <Entypo name="dots-three-vertical" size={16} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: C.border,
  },
  details: { flex: 1, marginLeft: 12 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  cropName: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  badge: {
    backgroundColor: C.badgeBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: C.badgeText },
  meta: { fontSize: 13, color: C.textSecondary, marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationText: { fontSize: 12, color: C.textMuted, marginLeft: 2 },
  menu: { padding: 6, alignSelf: 'flex-start', marginTop: 2 },
});

// ─── Main Screen ──────────────────────────────────────────────
export default function FarmerScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // ── Add Product modal state ────────────────────────────────
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [quantityAvailable, setQuantityAvailable] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState<Unit | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch {
      // silently fail — listings stay empty
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const visibleProducts = showAll ? products : products.slice(0, 2);

  const handleAddProduct = async () => {
    if (!user) { Alert.alert('Not logged in', 'Please log in to add a product.'); return; }
    if (!productName.trim()) { Alert.alert('Missing field', 'Please enter a product name.'); return; }
    if (!category) { Alert.alert('Missing field', 'Please select a category.'); return; }
    if (!quantityAvailable.trim() || isNaN(Number(quantityAvailable))) { Alert.alert('Missing field', 'Please enter a valid quantity.'); return; }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) { Alert.alert('Missing field', 'Please enter a valid price greater than 0.'); return; }
    if (!unit) { Alert.alert('Missing field', 'Please select a unit.'); return; }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await createProduct({
        name: productName.trim(),
        category,
        quantityAvailable: Number(quantityAvailable),
        price: Number(price),
        unit,
        farmerId: user.id,
        description: description.trim() || undefined,
      });
      Alert.alert('Success', 'Product created successfully!');
      setProductName(''); setCategory(null); setQuantityAvailable(''); setPrice(''); setUnit(null); setDescription('');
      setShowAddProduct(false);
      fetchProducts();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity accessibilityLabel="Profile" accessibilityRole="button">
          <Ionicons name="person-circle-outline" size={28} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={s.logoRow}>
          <Text style={s.logoText}>FarmHustle</Text>
          <Text style={s.logoLeaf}>🌿</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Notifications" accessibilityRole="button">
          <Ionicons name="notifications-outline" size={26} color={C.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Listings */}
        <View style={s.listingsHeader}>
          <Text style={s.listingsTitle}>Your Listings</Text>
          <TouchableOpacity onPress={() => setShowAll((v) => !v)} accessibilityRole="button">
            <Text style={s.viewAll}>{showAll ? 'Show less' : 'View all'}</Text>
          </TouchableOpacity>
        </View>

        {loadingProducts ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} />
        ) : products.length === 0 ? (
          <Text style={s.emptyText}>No listings yet. Tap Add Product to get started.</Text>
        ) : (
          visibleProducts.map((item) => <ListingCard key={item.id} product={item} />)
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* FAB — opens the Add Product modal */}
      <TouchableOpacity
        style={ap.fab}
        onPress={() => setShowAddProduct(true)}
        accessibilityLabel="Add product to backend"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={22} color={C.white} />
        <Text style={ap.fabText}>Add Product</Text>
      </TouchableOpacity>

      {/* Add Product Modal */}
      <Modal
        visible={showAddProduct}
        animationType="slide"
        onRequestClose={() => { if (!submitting) setShowAddProduct(false); }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.white }} edges={['top', 'bottom']}>
          <View style={ap.modalHeader}>
            <Text style={ap.modalTitle}>Add Product</Text>
            <TouchableOpacity
              onPress={() => { if (!submitting) setShowAddProduct(false); }}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={C.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Product Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Maize"
              placeholderTextColor={C.textMuted}
              value={productName}
              onChangeText={setProductName}
              accessibilityLabel="Product name"
            />

            <Text style={s.label}>Category</Text>
            <View style={ap.chipRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[ap.chip, category === c && ap.chipSelected]}
                  onPress={() => setCategory(c)}
                  accessibilityLabel={`Category ${c}`}
                  accessibilityRole="radio"
                >
                  <Text style={[ap.chipText, category === c && ap.chipTextSelected]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Quantity Available</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 500"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={quantityAvailable}
              onChangeText={setQuantityAvailable}
              accessibilityLabel="Quantity available"
            />

            <Text style={s.label}>Unit</Text>
            <View style={ap.chipRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[ap.chip, unit === u && ap.chipSelected]}
                  onPress={() => setUnit(u)}
                  accessibilityLabel={`Unit ${u}`}
                  accessibilityRole="radio"
                >
                  <Text style={[ap.chipText, unit === u && ap.chipTextSelected]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Price (per unit, GHS)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 12.50"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              accessibilityLabel="Price per unit"
            />

            <Text style={s.label}>Description (optional)</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Describe your product..."
              placeholderTextColor={C.textMuted}
              multiline
              value={description}
              onChangeText={setDescription}
              accessibilityLabel="Description"
            />

            {submitError ? <Text style={ap.errorText}>{submitError}</Text> : null}

            <TouchableOpacity
              style={[s.createBtn, submitting && { opacity: 0.6 }, { marginBottom: 32 }]}
              onPress={handleAddProduct}
              disabled={submitting}
              accessibilityLabel="Submit product"
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
                  <Text style={s.createBtnText}>Submit Product</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.white },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: C.white,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 20, fontWeight: '700', color: C.primary },
  logoLeaf: { fontSize: 18, marginLeft: 4 },
  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.textPrimary, backgroundColor: C.white,
  },
  createBtn: {
    backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, gap: 8,
  },
  createBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },
  listingsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  listingsTitle: { fontSize: 17, fontWeight: '700', color: C.textPrimary },
  viewAll: { fontSize: 13, color: C.primary, fontWeight: '600' },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 24, marginHorizontal: 32 },
});

// ─── Add Product styles ───────────────────────────────────────
const ap = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: C.primary,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fabText: { color: C.white, fontWeight: '700', fontSize: 14 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: C.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: C.white,
  },
  chipSelected: { borderColor: C.primary, backgroundColor: C.badgeBg },
  chipText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: C.primary, fontWeight: '700' },
  errorText: { color: '#D32F2F', fontSize: 13, marginTop: 8, marginBottom: 4 },
});
