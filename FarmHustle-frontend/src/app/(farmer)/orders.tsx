import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getOrdersByFarmer, updateOrderStatus, Order, TEMP_TEST_FARMER_ID } from '../../api/client';

const C = {
  primary: '#2F7A4D',
  dark: '#1B3A2B',
  white: '#FFFFFF',
  bg: '#F5F5F5',
  border: '#E0E0E0',
  textPrimary: '#1A1A1A',
  textMuted: '#9E9E9E',
  textSecondary: '#6B6B6B',
  pending: '#F59E0B',
  pendingBg: '#FFFBEB',
  accepted: '#2F7A4D',
  acceptedBg: '#E8F5EE',
  declined: '#DC2626',
  declinedBg: '#FEF2F2',
  completed: '#1D4ED8',
  completedBg: '#EFF6FF',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pending',   color: C.pending,   bg: C.pendingBg },
  ACCEPTED:  { label: 'Accepted',  color: C.accepted,  bg: C.acceptedBg },
  DECLINED:  { label: 'Declined',  color: C.declined,  bg: C.declinedBg },
  COMPLETED: { label: 'Completed', color: C.completed, bg: C.completedBg },
  CANCELLED: { label: 'Cancelled', color: C.textMuted, bg: C.bg },
};

function OrderCard({
  order,
  onAccept,
  onDecline,
}: {
  order: Order;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
  const isPending = order.status === 'PENDING';
  const commission = order.totalPrice * 0.05;
  const net = order.totalPrice - commission;

  return (
    <View style={card.wrap}>
      {/* Top row */}
      <View style={card.topRow}>
        <Text style={card.productName}>{order.product?.name ?? 'Product'}</Text>
        <View style={[card.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[card.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Buyer */}
      <View style={card.row}>
        <Ionicons name="person-outline" size={14} color={C.textMuted} />
        <Text style={card.meta}>{order.buyer?.name ?? 'Buyer'}  ·  {order.buyer?.region ?? ''}</Text>
      </View>

      {/* Quantity + price */}
      <View style={card.row}>
        <Ionicons name="cube-outline" size={14} color={C.textMuted} />
        <Text style={card.meta}>
          {order.quantity} {order.product?.unit ?? ''}  ·  GHS {order.totalPrice?.toFixed(2) ?? '0.00'}
        </Text>
      </View>

      {/* Earnings after 5% commission */}
      <View style={[card.row, { marginTop: 4 }]}>
        <Ionicons name="wallet-outline" size={14} color={C.primary} />
        <Text style={[card.meta, { color: C.primary, fontWeight: '600' }]}>
          You earn: GHS {net.toFixed(2)} (after 5% commission)
        </Text>
      </View>

      {/* Date */}
      <Text style={card.date}>
        {new Date(order.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>

      {/* Actions — only show for PENDING orders */}
      {isPending && (
        <View style={card.actions}>
          <TouchableOpacity
            style={card.declineBtn}
            onPress={() => onDecline(order.id)}
            accessibilityLabel="Decline order"
            accessibilityRole="button"
          >
            <Ionicons name="close-circle-outline" size={18} color={C.declined} />
            <Text style={[card.actionText, { color: C.declined }]}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={card.acceptBtn}
            onPress={() => onAccept(order.id)}
            accessibilityLabel="Accept order"
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={C.white} />
            <Text style={[card.actionText, { color: C.white }]}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: '700', color: C.textPrimary, flex: 1, marginRight: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  meta: { fontSize: 13, color: C.textSecondary },
  date: { fontSize: 11, color: C.textMuted, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: C.declined,
    borderRadius: 10, paddingVertical: 10,
  },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.primary,
    borderRadius: 10, paddingVertical: 10,
  },
  actionText: { fontSize: 14, fontWeight: '700' },
});

// ─── Filter tabs ──────────────────────────────────────────────
const FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED'] as const;
type Filter = typeof FILTERS[number];

export default function FarmerOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const handleAction = async (orderId: string, status: 'ACCEPTED' | 'DECLINED') => {
    const label = status === 'ACCEPTED' ? 'accept' : 'decline';
    Alert.alert(
      `${status === 'ACCEPTED' ? 'Accept' : 'Decline'} order?`,
      `Are you sure you want to ${label} this order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'ACCEPTED' ? 'Accept' : 'Decline',
          style: status === 'DECLINED' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(orderId);
            try {
              const updated = await updateOrderStatus(orderId, status);
              setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o));
            } catch {
              Alert.alert('Error', 'Failed to update order. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Orders</Text>
        {pendingCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{pendingCount} new</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.filterWrap}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.filterTab, filter === item && s.filterTabActive]}
              onPress={() => setFilter(item)}
              accessibilityRole="button"
            >
              <Text style={[s.filterText, filter === item && s.filterTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={48} color={C.textMuted} />
          <Text style={s.emptyText}>
            {filter === 'ALL' ? 'No orders yet.' : `No ${filter.toLowerCase()} orders.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => (
            <View pointerEvents={actionLoading === item.id ? 'none' : 'auto'} style={{ opacity: actionLoading === item.id ? 0.5 : 1 }}>
              <OrderCard
                order={item}
                onAccept={(id) => handleAction(id, 'ACCEPTED')}
                onDecline={(id) => handleAction(id, 'DECLINED')}
              />
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor={C.primary} />}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: C.dark },
  badge: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: C.white, fontSize: 12, fontWeight: '700' },
  filterWrap: { backgroundColor: C.white, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
  },
  filterTabActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  filterTextActive: { color: C.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: C.textMuted },
});
