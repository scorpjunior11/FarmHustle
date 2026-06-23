import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons, Feather, Entypo } from '@expo/vector-icons';

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

// ─── Types ────────────────────────────────────────────────────
type ProductStatus = 'Active' | 'Sold Out' | 'Suspended';

interface Listing {
  id: string;
  cropName: string;
  quantity: number;
  pricePerKg: number;
  location: string;
  imageKey?: string; // maps to LOCAL_IMAGES
  imageUri?: string; // user-picked URI
  status: ProductStatus;
}

// ─── Local Images ─────────────────────────────────────────────
const LOCAL_IMAGES: Record<string, ImageSourcePropType> = {
  maize: require('../../../assets/images/Maize.jpg'),
  tomatoes: require('../../../assets/images/Tomatoes.jpg'),
  yam: require('../../../assets/images/Yam.jpg'),
  plantain: require('../../../assets/images/Plantain.jpg'),
};

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_LISTINGS: Listing[] = [
  {
    id: '1',
    cropName: 'Maize',
    quantity: 500,
    pricePerKg: 12,
    location: 'Kumasi, Ashanti',
    imageKey: 'maize',
    status: 'Active',
  },
  {
    id: '2',
    cropName: 'Tomatoes',
    quantity: 200,
    pricePerKg: 20,
    location: 'Ejisu, Ashanti',
    imageKey: 'tomatoes',
    status: 'Active',
  },
  {
    id: '3',
    cropName: 'Yam',
    quantity: 350,
    pricePerKg: 8,
    location: 'Tamale, Northern',
    imageKey: 'yam',
    status: 'Active',
  },
  {
    id: '4',
    cropName: 'Plantain',
    quantity: 180,
    pricePerKg: 5,
    location: 'Cape Coast, Central',
    imageKey: 'plantain',
    status: 'Active',
  },
];

// ─── Listing Card ─────────────────────────────────────────────
function ListingCard({ listing }: { listing: Listing }) {
  const { cropName, quantity, pricePerKg, location, imageKey, imageUri, status } = listing;

  const imageSource: ImageSourcePropType =
    imageKey && LOCAL_IMAGES[imageKey]
      ? LOCAL_IMAGES[imageKey]
      : imageUri
      ? { uri: imageUri }
      : require('../../../assets/images/icon.png');

  return (
    <View style={cardStyles.card}>
      <Image source={imageSource} style={cardStyles.image} accessibilityLabel={`Photo of ${cropName}`} />
      <View style={cardStyles.details}>
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.cropName}>{cropName}</Text>
          <View style={cardStyles.badge}>
            <Text style={cardStyles.badgeText}>{status}</Text>
          </View>
        </View>
        <Text style={cardStyles.meta}>{quantity}kg  ·  GHS {pricePerKg}/kg</Text>
        <View style={cardStyles.locationRow}>
          <MaterialIcons name="location-pin" size={13} color={C.textMuted} />
          <Text style={cardStyles.locationText}>{location}</Text>
        </View>
      </View>
      <TouchableOpacity style={cardStyles.menu} accessibilityLabel={`Options for ${cropName}`} accessibilityRole="button">
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
  const [cropName, setCropName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [pickedUri, setPickedUri] = useState<string | undefined>(undefined);
  const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
  const [showAll, setShowAll] = useState(false);

  const visibleListings = showAll ? listings : listings.slice(0, 2);

  const handlePickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setPickedUri(result.assets[0].uri);
  };

  const handleCreateListing = () => {
    if (!cropName.trim()) return Alert.alert('Missing field', 'Please enter a crop name.');
    if (!quantity.trim() || isNaN(Number(quantity))) return Alert.alert('Missing field', 'Please enter a valid quantity.');
    if (!price.trim() || isNaN(Number(price))) return Alert.alert('Missing field', 'Please enter a valid price.');
    if (!location.trim()) return Alert.alert('Missing field', 'Please enter a location.');

    const newListing: Listing = {
      id: Date.now().toString(),
      cropName: cropName.trim(),
      quantity: Number(quantity),
      pricePerKg: Number(price),
      location: location.trim(),
      imageUri: pickedUri,
      status: 'Active',
    };

    setListings((prev) => [newListing, ...prev]);
    setCropName(''); setQuantity(''); setPrice(''); setLocation(''); setPickedUri(undefined);
    Alert.alert('Success', 'Your listing has been created!');
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

        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name="leaf" size={28} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>Create New Listing</Text>
            <Text style={s.bannerSub}>List your produce and reach buyers</Text>
          </View>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.label}>Crop Name</Text>
          <TextInput style={s.input} placeholder="e.g. Maize" placeholderTextColor={C.textMuted} value={cropName} onChangeText={setCropName} accessibilityLabel="Crop name" />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Quantity (kg)</Text>
              <TextInput style={s.input} placeholder="500" placeholderTextColor={C.textMuted} keyboardType="numeric" value={quantity} onChangeText={setQuantity} accessibilityLabel="Quantity" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Price per kg (GHS)</Text>
              <TextInput style={s.input} placeholder="12" placeholderTextColor={C.textMuted} keyboardType="numeric" value={price} onChangeText={setPrice} accessibilityLabel="Price" />
            </View>
          </View>

          <Text style={s.label}>Location</Text>
          <View style={s.inputRow}>
            <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]} placeholder="Kumasi, Ashanti Region" placeholderTextColor={C.textMuted} value={location} onChangeText={setLocation} accessibilityLabel="Location" />
            <MaterialIcons name="location-pin" size={20} color={C.textMuted} />
          </View>

          <Text style={s.label}>Photo (optional)</Text>
          <TouchableOpacity style={s.uploadArea} onPress={handlePickImage} accessibilityLabel="Upload photo" accessibilityRole="button">
            {pickedUri ? (
              <Image source={{ uri: pickedUri }} style={s.previewImage} />
            ) : (
              <>
                <Feather name="camera" size={28} color={C.textMuted} />
                <Text style={s.uploadTitle}>Upload Image</Text>
                <Text style={s.uploadSub}>Tap to add a photo</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.createBtn} onPress={handleCreateListing} accessibilityLabel="Create listing" accessibilityRole="button">
            <Ionicons name="add-circle-outline" size={20} color={C.white} />
            <Text style={s.createBtnText}>Create Listing</Text>
          </TouchableOpacity>
        </View>

        {/* Listings */}
        <View style={s.listingsHeader}>
          <Text style={s.listingsTitle}>Your Listings</Text>
          <TouchableOpacity onPress={() => setShowAll((v) => !v)} accessibilityRole="button">
            <Text style={s.viewAll}>{showAll ? 'Show less' : 'View all'}</Text>
          </TouchableOpacity>
        </View>

        {visibleListings.map((item) => <ListingCard key={item.id} listing={item} />)}

        <View style={{ height: 20 }} />
      </ScrollView>
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
  banner: {
    backgroundColor: C.primary, marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center',
  },
  bannerIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  bannerTitle: { color: C.white, fontSize: 16, fontWeight: '700' },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  form: {
    backgroundColor: C.white, marginHorizontal: 16,
    marginTop: 12, borderRadius: 12, padding: 16,
  },
  label: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.textPrimary, backgroundColor: C.white,
  },
  row: { flexDirection: 'row', gap: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    backgroundColor: C.white, paddingRight: 10,
  },
  uploadArea: {
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
    borderRadius: 10, height: 100, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#F9F9F9', overflow: 'hidden',
  },
  uploadTitle: { fontSize: 14, fontWeight: '600', color: C.textSecondary, marginTop: 6 },
  uploadSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
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
});
