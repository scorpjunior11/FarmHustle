import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  earningsBg: '#E8F5EE',
};

const COMMISSION_RATE = 0.05; // 5%

function EarningsRow({ order }: { order: Order }) {
  const gross = order.totalPrice ?? 0;
  const commission = gross * COMMISSION_RATE;
  const net = gross - commission;

  return (
    <View style={row.wrap}>
      <View style={row.left}>
        <Text style={row.product}>{order.product?.name ?? 'Product'}</Text>
        <Text style={row.meta}>
          {order.quantity} {order.product?.unit ?? ''}  ·  {order.buyer?.name ?? 'Buyer'}
        </Text>
        <Text style={row.date}>
          {new Date(order.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <View style={row.right}>
        <Text style={row.net}>GHS {net.toFixed(2)}</Text>
        <Text style={row.commission}>-5% = GHS {commission.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  left: { flex: 1 },
  product: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  meta: { fontSize: 13, color: C.textSecondary, marginTop: 3 },
  date: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  right: { alignItems: 'flex-end' },
  net: { fontSize: 16, fontWeight: '800', color: C.primary },
  commission: { fontSize: 11, color: C.textMuted, marginTop: 3 },
});

export default function EarningsScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getOrdersByFarmer(TEMP_TEST_FARMER_ID);
      // Only count completed orders as earnings
      setOrders(data.filter((o) => o.status === 'COMPLETED'));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Summary calculations ──────────────────────────────────
  const totalGross = orders.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);
  const totalCommission = totalGross * COMMISSION_RATE;
  const totalNet = totalGross - totalCommission;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Earnings</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor={C.primary} />
          }
          ListHeaderComponent={
            <>
              {/* Summary card */}
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Total Earnings (after commission)</Text>
                <Text style={s.summaryAmount}>GHS {totalNet.toFixed(2)}</Text>
                <View style={s.summaryRow}>
                  <View style={s.summaryItem}>
                    <Text style={s.summaryItemLabel}>Gross Sales</Text>
                    <Text style={s.summaryItemValue}>GHS {totalGross.toFixed(2)}</Text>
                  </View>
                  <View style={s.divider} />
                  <View style={s.summaryItem}>
                    <Text style={s.summaryItemLabel}>Platform Fee (5%)</Text>
                    <Text style={[s.summaryItemValue, { color: '#DC2626' }]}>- GHS {totalCommission.toFixed(2)}</Text>
                  </View>
                  <View style={s.divider} />
                  <View style={s.summaryItem}>
                    <Text style={s.summaryItemLabel}>Orders</Text>
                    <Text style={s.summaryItemValue}>{orders.length}</Text>
                  </View>
                </View>
              </View>

              <Text style={s.sectionTitle}>Completed Orders</Text>
            </>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="wallet-outline" size={48} color={C.textMuted} />
              <Text style={s.emptyText}>No completed orders yet.</Text>
              <Text style={s.emptySubText}>Earnings appear here when orders are completed.</Text>
            </View>
          }
          renderItem={({ item }) => <EarningsRow order={item} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: C.dark },
  summaryCard: {
    backgroundColor: C.primary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  summaryAmount: { fontSize: 36, fontWeight: '800', color: C.white, marginTop: 4, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryItemLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  summaryItemValue: { fontSize: 15, fontWeight: '700', color: C.white, marginTop: 4 },
  divider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.dark, marginHorizontal: 16, marginBottom: 10 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 48, gap: 10 },
  emptyText: { fontSize: 16, color: C.textMuted, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
