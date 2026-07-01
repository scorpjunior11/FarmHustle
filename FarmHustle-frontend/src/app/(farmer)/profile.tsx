import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getOrdersByFarmer, Order, TEMP_TEST_FARMER_ID } from '../../api/client';

const C = {
  primary: '#2F7A4D',
  dark: '#1B3A2B',
  white: '#FFFFFF',
  bg: '#F5F5F5',
  border: '#E0E0E0',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#9E9E9E',
};

// Mock farmer profile — replace with real auth user when available
const MOCK_FARMER = {
  name: 'Kwame Asante',
  email: 'kwame@farmhustle.gh',
  phone: '+233 24 000 0001',
  region: 'Ashanti',
  role: 'FARMER',
  joinedDate: '2024-03-10',
};

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={stat.wrap}>
      <Ionicons name={icon as any} size={22} color={C.primary} />
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', backgroundColor: C.white,
    borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  value: { fontSize: 20, fontWeight: '800', color: C.dark, marginTop: 6 },
  label: { fontSize: 11, color: C.textMuted, marginTop: 2, textAlign: 'center' },
});

export default function FarmerProfileScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getOrdersByFarmer(TEMP_TEST_FARMER_ID);
      setOrders(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const completed = orders.filter((o) => o.status === 'COMPLETED').length;
  const pending = orders.filter((o) => o.status === 'PENDING').length;
  const totalEarnings = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + (o.totalPrice ?? 0) * 0.95, 0);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => router.replace('/') },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor={C.primary} />}
      >
        {/* Avatar + name */}
        <View style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {MOCK_FARMER.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
            </Text>
          </View>
          <Text style={s.name}>{MOCK_FARMER.name}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>🌾 Farmer</Text>
          </View>
        </View>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={s.statsRow}>
            <StatCard icon="receipt-outline" label="Total Orders" value={String(orders.length)} />
            <View style={{ width: 10 }} />
            <StatCard icon="checkmark-circle-outline" label="Completed" value={String(completed)} />
            <View style={{ width: 10 }} />
            <StatCard icon="time-outline" label="Pending" value={String(pending)} />
          </View>
        )}

        {/* Earnings summary */}
        <View style={s.earningsCard}>
          <Ionicons name="wallet-outline" size={20} color={C.white} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.earningsLabel}>Total Earnings (after 5% fee)</Text>
            <Text style={s.earningsAmount}>GHS {totalEarnings.toFixed(2)}</Text>
          </View>
        </View>

        {/* Info section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account Details</Text>

          {[
            { icon: 'mail-outline', label: 'Email', value: MOCK_FARMER.email },
            { icon: 'call-outline', label: 'Phone', value: MOCK_FARMER.phone },
            { icon: 'location-outline', label: 'Region', value: MOCK_FARMER.region },
            { icon: 'calendar-outline', label: 'Joined', value: new Date(MOCK_FARMER.joinedDate).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' }) },
          ].map((item) => (
            <View key={item.label} style={s.infoRow}>
              <Ionicons name={item.icon as any} size={18} color={C.primary} style={{ marginRight: 12 }} />
              <View>
                <Text style={s.infoLabel}>{item.label}</Text>
                <Text style={s.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          accessibilityLabel="Log out"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 28, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: C.white },
  name: { fontSize: 22, fontWeight: '800', color: C.dark },
  roleBadge: { marginTop: 6, backgroundColor: '#E8F5EE', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  roleText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16 },
  earningsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.primary, marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 16,
  },
  earningsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  earningsAmount: { fontSize: 22, fontWeight: '800', color: C.white, marginTop: 2 },
  section: {
    backgroundColor: C.white, marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.dark, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel: { fontSize: 11, color: C.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, marginTop: 20,
    borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 12, paddingVertical: 14,
    backgroundColor: C.white,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
});
