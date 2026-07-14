import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createProduct, getProducts, deactivateProduct, reactivateProduct, deleteProduct, Product } from '../../api/client';
import { uploadImageToCloudinary } from '../../api/uploadImage';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../theme/theme';

const { colors } = THEME;
const HAIRLINE = '#EEEEEE';
const PLACEHOLDER_BG = '#F2F4F2';
const INPUT_BG = '#F5F6F5';

const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} as const;

// ─── Add Product form options ─────────────────────────────────
const CATEGORIES = ['GRAINS', 'VEGETABLES', 'FRUITS', 'TUBERS', 'OTHER'] as const;
const UNITS = ['KG', 'BAG', 'CRATE', 'BUNCH'] as const;
type Category = typeof CATEGORIES[number];
type Unit = typeof UNITS[number];

const categoryLabel = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

// ─── Listing Card ─────────────────────────────────────────────
function ListingCard({
  product,
  busy,
  onRemove,
  onReactivate,
  onDelete,
}: {
  product: Product;
  busy: boolean;
  onRemove: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const inactive = !product.isActive;
  return (
    <View style={[cardStyles.card, inactive && cardStyles.cardInactive]}>
      {/* Image */}
      <View style={cardStyles.imageWrap}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={cardStyles.image}
            resizeMode="cover"
            accessibilityLabel={`Photo of ${product.name}`}
          />
        ) : (
          <View style={[cardStyles.image, cardStyles.imagePlaceholder]}>
            <Ionicons name="leaf-outline" size={34} color="#C4CDC6" />
          </View>
        )}

        {inactive ? <View style={cardStyles.inactiveOverlay} /> : null}

        {/* Gold category tag */}
        <View style={cardStyles.categoryTag}>
          <Text style={cardStyles.categoryTagText}>{categoryLabel(product.category)}</Text>
        </View>

        {/* Remove action (active listings only) */}
        {product.isActive ? (
          busy ? (
            <View style={cardStyles.removeBtn}>
              <ActivityIndicator size="small" color={colors.danger} />
            </View>
          ) : (
            <TouchableOpacity
              style={cardStyles.removeBtn}
              onPress={onRemove}
              accessibilityLabel={`Remove ${product.name}`}
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          )
        ) : null}
      </View>

      {/* Body */}
      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          <Text style={[cardStyles.cropName, inactive && cardStyles.textInactive]} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={[cardStyles.statusPill, inactive ? cardStyles.statusPillInactive : cardStyles.statusPillActive]}>
            <Text style={[cardStyles.statusText, inactive ? cardStyles.statusTextInactive : cardStyles.statusTextActive]}>
              {product.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={cardStyles.metaRow}>
          <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
          <Text style={cardStyles.metaText}>
            {product.quantityAvailable} {product.unit} available
          </Text>
        </View>

        <View style={cardStyles.priceBlock}>
          <Text style={[cardStyles.priceText, inactive && cardStyles.textInactive]}>GHS {product.price}</Text>
          <Text style={cardStyles.priceUnit}> / {product.unit}</Text>
        </View>

        {/* Inactive listings: reactivate or permanently delete */}
        {inactive ? (
          <View style={cardStyles.inactiveActions}>
            <TouchableOpacity
              style={[cardStyles.reactivateBtn, busy && cardStyles.actionDisabled]}
              onPress={onReactivate}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={15} color={colors.primary} />
                  <Text style={cardStyles.reactivateText}>Reactivate</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[cardStyles.deleteBtn, busy && cardStyles.actionDisabled]}
              onPress={onDelete}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={15} color={colors.danger} />
              <Text style={cardStyles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HAIRLINE,
    marginHorizontal: 16,
    marginBottom: 14,
    ...cardShadow,
  },
  cardInactive: { opacity: 0.85 },
  imageWrap: { position: 'relative' },
  image: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  imagePlaceholder: { backgroundColor: PLACEHOLDER_BG, justifyContent: 'center', alignItems: 'center' },
  inactiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    backgroundColor: 'rgba(245,246,245,0.55)',
  },
  categoryTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  categoryTagText: { fontSize: 10, fontWeight: '800', color: colors.accentText, letterSpacing: 0.3 },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  body: { padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cropName: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  textInactive: { color: colors.textMuted },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusPillActive: { backgroundColor: '#E8F5E9' },
  statusPillInactive: { backgroundColor: '#EDEDED' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: colors.primary },
  statusTextInactive: { color: colors.textMuted },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  metaText: { fontSize: 12.5, color: colors.textMuted },

  priceBlock: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  priceText: { fontSize: 17, fontWeight: '800', color: colors.primary },
  priceUnit: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },

  inactiveActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  reactivateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  reactivateText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E57373',
    backgroundColor: colors.white,
  },
  deleteText: { fontSize: 13, fontWeight: '700', color: colors.danger },
  actionDisabled: { opacity: 0.6 },
});

// ─── Main Screen ──────────────────────────────────────────────
export default function FarmerScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingProductId, setActingProductId] = useState<string | null>(null);

  // ── Add Product modal state ────────────────────────────────
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [quantityAvailable, setQuantityAvailable] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState<Unit | null>(null);
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!user) {
      setLoadingProducts(false);
      return;
    }
    try {
      const data = await getProducts();
      setProducts(data.filter((p) => p.farmer.id === user.id));
    } catch {
      // silently fail — listings stay empty
    } finally {
      setLoadingProducts(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleRemove = (product: Product) => {
    Alert.alert(
      'Remove this listing?',
      'Buyers will no longer see it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActingProductId(product.id);
            try {
              const updated = await deactivateProduct(product.id);
              setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
            } catch (err) {
              Alert.alert(
                'Could not remove listing',
                err instanceof Error ? err.message : 'Something went wrong.'
              );
            } finally {
              setActingProductId(null);
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async (product: Product) => {
    setActingProductId(product.id);
    try {
      const updated = await reactivateProduct(product.id);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Could not reactivate', raw.replace(/^\d{3}:\s*/, ''));
    } finally {
      setActingProductId(null);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete permanently?',
      'This removes the listing for good. Products with existing orders can’t be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActingProductId(product.id);
            try {
              await deleteProduct(product.id);
              setProducts((prev) => prev.filter((p) => p.id !== product.id));
            } catch (err) {
              const raw = err instanceof Error ? err.message : 'Something went wrong.';
              Alert.alert('Could not delete', raw.replace(/^\d{3}:\s*/, ''));
            } finally {
              setActingProductId(null);
            }
          },
        },
      ]
    );
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to add a product photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  };

  const handleAddProduct = async () => {
    if (!user) { Alert.alert('Not logged in', 'Please log in to add a product.'); return; }
    if (!productName.trim()) { Alert.alert('Missing field', 'Please enter a product name.'); return; }
    if (!category) { Alert.alert('Missing field', 'Please select a category.'); return; }
    if (
      !quantityAvailable.trim() ||
      isNaN(Number(quantityAvailable)) ||
      Number(quantityAvailable) <= 0 ||
      !Number.isInteger(Number(quantityAvailable))
    ) { Alert.alert('Missing field', 'Please enter a valid whole number quantity greater than 0.'); return; }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) { Alert.alert('Missing field', 'Please enter a valid price greater than 0.'); return; }
    if (!unit) { Alert.alert('Missing field', 'Please select a unit.'); return; }

    setSubmitting(true);
    setSubmitError(null);
    try {
      let imageUrl: string | undefined;
      if (imageBase64) {
        setUploadingImage(true);
        try {
          imageUrl = await uploadImageToCloudinary(imageBase64);
        } finally {
          setUploadingImage(false);
        }
      }
      await createProduct({
        name: productName.trim(),
        category,
        quantityAvailable: Number(quantityAvailable),
        price: Number(price),
        unit,
        farmerId: user.id,
        description: description.trim() || undefined,
        imageUrl,
      });
      Alert.alert('Success', 'Product created successfully!');
      setProductName(''); setCategory(null); setQuantityAvailable(''); setPrice(''); setUnit(null); setDescription('');
      setImageUri(null);
      setImageBase64(null);
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
      {/* Green header banner */}
      <View style={s.banner}>
        <View style={s.brandRow}>
          <View style={s.brandMark}>
            <Ionicons name="leaf" size={17} color={colors.accent} />
          </View>
          <Text style={s.wordmark}>
            Farm<Text style={s.wordmarkAccent}>Hustle</Text>
          </Text>
        </View>
        <Text style={s.bannerHeading}>Your Listings</Text>
        <Text style={s.bannerSubtitle}>Manage the crops you&apos;re selling</Text>
      </View>

      {loadingProducts ? (
        <View style={s.loadingBlock}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 88 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          data={products}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyCircle}>
                <Ionicons name="leaf-outline" size={40} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>No listings yet</Text>
              <Text style={s.emptySub}>Add your first product to start selling</Text>
              <TouchableOpacity
                style={s.emptyCta}
                onPress={() => setShowAddProduct(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={s.emptyCtaText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <ListingCard
              product={item}
              busy={actingProductId === item.id}
              onRemove={() => handleRemove(item)}
              onReactivate={() => handleReactivate(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      {/* FAB — opens the Add Product modal */}
      <TouchableOpacity
        style={[ap.fab, { bottom: insets.bottom + 76 }]}
        onPress={() => setShowAddProduct(true)}
        accessibilityLabel="Add product to backend"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={22} color={colors.white} />
        <Text style={ap.fabText}>Add Product</Text>
      </TouchableOpacity>

      {/* Add Product Modal */}
      <Modal
        visible={showAddProduct}
        animationType="slide"
        onRequestClose={() => { if (!submitting) setShowAddProduct(false); }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
          <View style={ap.modalHeader}>
            <Text style={ap.modalTitle}>Add Product</Text>
            <TouchableOpacity
              onPress={() => { if (!submitting) setShowAddProduct(false); }}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Photo (optional)</Text>
            {imageUri ? (
              <View style={ap.photoPreviewWrap}>
                <Image source={{ uri: imageUri }} style={ap.photoPreview} accessibilityLabel="Selected product photo" />
                <View style={ap.photoActions}>
                  <TouchableOpacity
                    style={ap.photoActionBtn}
                    onPress={handlePickImage}
                    accessibilityLabel="Replace photo"
                    accessibilityRole="button"
                  >
                    <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
                    <Text style={ap.photoActionText}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={ap.photoActionBtn}
                    onPress={() => { setImageUri(null); setImageBase64(null); }}
                    accessibilityLabel="Remove photo"
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={[ap.photoActionText, { color: colors.danger }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={ap.photoPicker}
                onPress={handlePickImage}
                accessibilityLabel="Add photo"
                accessibilityRole="button"
              >
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
                <Text style={ap.photoPickerText}>Add photo</Text>
              </TouchableOpacity>
            )}

            <Text style={s.label}>Product Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Maize"
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              accessibilityLabel="Price per unit"
            />

            <Text style={s.label}>Description (optional)</Text>
            <TextInput
              style={[s.input, { height: 90, textAlignVertical: 'top' }]}
              placeholder="Describe your product..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={description}
              onChangeText={setDescription}
              accessibilityLabel="Description"
            />

            {submitError ? <Text style={ap.errorText}>{submitError}</Text> : null}

            <TouchableOpacity
              style={[s.createBtn, submitting && { opacity: 0.6 }]}
              onPress={handleAddProduct}
              disabled={submitting}
              accessibilityLabel="Submit product"
              accessibilityRole="button"
            >
              {submitting ? (
                <>
                  <ActivityIndicator color={colors.white} />
                  {uploadingImage ? (
                    <Text style={s.createBtnText}>Uploading image...</Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                  <Text style={s.createBtnText}>List product</Text>
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
  safeArea: { flex: 1, backgroundColor: colors.primary },

  // Green banner
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: { fontSize: 18, fontWeight: '800', color: colors.white, letterSpacing: 0.2 },
  wordmarkAccent: { color: colors.accent },
  bannerHeading: { fontSize: 22, fontWeight: '800', color: colors.white },
  bannerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 3 },

  scroll: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingTop: 16, flexGrow: 1 },
  loadingBlock: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },

  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 7, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: HAIRLINE, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.text, backgroundColor: INPUT_BG,
  },
  createBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 22, gap: 8,
  },
  createBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },

  // Rich empty state
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 8 },
  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  emptyCta: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyCtaText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});

// ─── Add Product styles ───────────────────────────────────────
const ap = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
  },
  fabText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE,
    backgroundColor: colors.bg,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  chip: {
    borderWidth: 1.5,
    borderColor: HAIRLINE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: INPUT_BG,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  chipTextSelected: { color: colors.white, fontWeight: '700' },
  errorText: { color: colors.danger, fontSize: 13, marginTop: 12 },
  photoPicker: {
    borderWidth: 1.5,
    borderColor: HAIRLINE,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: INPUT_BG,
  },
  photoPickerText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  photoPreviewWrap: { gap: 10 },
  photoPreview: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    backgroundColor: PLACEHOLDER_BG,
  },
  photoActions: { flexDirection: 'row', gap: 18 },
  photoActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  photoActionText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
