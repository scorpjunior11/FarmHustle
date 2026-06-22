import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DeliveryJobsScreen() {
  // Mock data matching your Figma UI perfectly
  const jobs = [
    {
      id: 1,
      from: 'Kumasi, Ashanti',
      to: 'Accra, Greater Accra',
      item: 'Maize',
      icon: 'corn',
      iconType: 'MaterialCommunityIcons',
      quantity: '500kg',
      fee: 'GHS 150',
      posted: '1 hour ago',
    },
    {
      id: 2,
      from: 'Ejisu, Ashanti',
      to: 'Tamale, Northern',
      item: 'Tomatoes',
      icon: 'food-apple', // using close matching icons
      iconType: 'MaterialCommunityIcons',
      quantity: '200kg',
      fee: 'GHS 120',
      posted: '2 hours ago',
    },
    {
      id: 3,
      from: 'Kumasi, Ashanti',
      to: 'Cape Coast, Central',
      item: 'Plantain',
      icon: 'leaf',
      iconType: 'Ionicons',
      quantity: '300kg',
      fee: 'GHS 130',
      posted: '3 hours ago',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navbar */}
      <View style={styles.headerRow}>
        <TouchableOpacity><Ionicons name="person-circle-outline" size={32} color="#666" /></TouchableOpacity>
        <Text style={styles.brandTitle}>FarmHustle <Text style={styles.leafIcon}>🌱</Text></Text>
        <TouchableOpacity><Ionicons name="notifications-outline" size={26} color="#666" /></TouchableOpacity>
      </View>

      {/* Main Container */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Delivery Jobs</Text>
        <Text style={styles.screenSubtitle}>Find and accept delivery jobs</Text>

        {/* Job Cards */}
        {jobs.map((job) => (
          <View key={job.id} style={styles.jobCard}>
            {/* Route Row */}
            <View style={styles.routeRow}>
              <View style={styles.truckIconBox}>
                <MaterialCommunityIcons name="truck-delivery" size={24} color="#2E7D32" />
              </View>
              <Text style={styles.routeText}>
                <Text style={styles.boldRoute}>{job.from}</Text>  ➔  <Text style={styles.boldRoute}>{job.to}</Text>
              </Text>
            </View>

            {/* Grid Metrics Row */}
            <View style={styles.metricsGrid}>
              {/* Item Column */}
              <View style={styles.metricColumn}>
                <Text style={styles.metricLabel}>Item</Text>
                <View style={styles.metricValueRow}>
                  {job.iconType === 'MaterialCommunityIcons' ? (
                    <MaterialCommunityIcons name={job.icon} size={18} color="#4CAF50" style={styles.metricIcon} />
                  ) : (
                    <Ionicons name={job.icon} size={18} color="#4CAF50" style={styles.metricIcon} />
                  )}
                  <Text style={styles.metricValue}>{job.item}</Text>
                </View>
              </View>

              {/* Quantity Column */}
              <View style={styles.metricColumn}>
                <Text style={styles.metricLabel}>Quantity</Text>
                <View style={styles.metricValueRow}>
                  <MaterialCommunityIcons name="package-variant-closed" size={18} color="#8B5A2B" style={styles.metricIcon} />
                  <Text style={styles.metricValue}>{job.quantity}</Text>
                </View>
              </View>

              {/* Delivery Fee Column */}
              <View style={styles.metricColumn}>
                <Text style={styles.metricLabel}>Delivery Fee</Text>
                <View style={styles.metricValueRow}>
                  <MaterialCommunityIcons name="cash-multiple" size={18} color="#2E7D32" style={styles.metricIcon} />
                  <Text style={styles.metricValue}>{job.fee}</Text>
                </View>
              </View>
            </View>

            {/* Footer Row */}
            <View style={styles.cardFooter}>
              <Text style={styles.timeText}>
                <Ionicons name="time-outline" size={14} color="#999" /> Posted {job.posted}
              </Text>
              <TouchableOpacity style={styles.acceptButton}>
                <Text style={styles.acceptButtonText}>Accept Job</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mock Tab Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="home" size={24} color="#2E7D32" />
          <Text style={[styles.tabLabel, styles.activeTabLabel]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={24} color="#999" />
          <Text style={styles.tabLabel}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="wallet-outline" size={24} color="#999" />
          <Text style={styles.tabLabel}>Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="person-outline" size={24} color="#999" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  brandTitle: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32' },
  container: { flex: 1, backgroundColor: '#fafafa', paddingHorizontal: 20 },
  screenTitle: { fontSize: 26, fontWeight: 'bold', color: '#111', marginTop: 20 },
  screenSubtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 15 },
  jobCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  truckIconBox: { backgroundColor: '#E8F5E9', padding: 8, borderRadius: 10, marginRight: 12 },
  routeText: { fontSize: 14, color: '#555', flex: 1 },
  boldRoute: { fontWeight: '600', color: '#222' },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 16, marginBottom: 12 },
  metricColumn: { flex: 1 },
  metricLabel: { fontSize: 11, color: '#999', marginBottom: 4, textAlign: 'center' },
  metricValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  metricIcon: { marginRight: 4 },
  metricValue: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: 12, color: '#999', flexDirection: 'row', alignItems: 'center' },
  acceptButton: { backgroundColor: '#2E7D32', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  acceptButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  bottomTabBar: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 70, 
    backgroundColor: '#ffffff', 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  activeTabLabel: { color: '#2E7D32', fontWeight: '600' }
});