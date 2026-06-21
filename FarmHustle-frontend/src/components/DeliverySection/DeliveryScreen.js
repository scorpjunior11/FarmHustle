import React from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import styles from './DeliveryStyles';

const DELIVERY_JOBS = [
  {
    id: '1',
    from: 'Kumasi, Ashanti',
    to: 'Accra, Greater Accra',
    item: 'Maize',
    itemIcon: 'corn',
    quantity: '500kg',
    fee: 'GHS 150',
    posted: '1 hour ago',
  },
  {
    id: '2',
    from: 'Ejisu, Ashanti',
    to: 'Tamale, Northern',
    item: 'Tomatoes',
    itemIcon: 'tomato',
    quantity: '200kg',
    fee: 'GHS 120',
    posted: '2 hours ago',
  },
  {
    id: '3',
    from: 'Kumasi, Ashanti',
    to: 'Cape Coast, Central',
    item: 'Plantain',
    itemIcon: 'banana',
    quantity: '300kg',
    fee: 'GHS 130',
    posted: '3 hours ago',
  },
];

export default function DeliveryScreen() {
  const renderJobCard = ({ item }) => (
    <View style={styles.card}>
      {/* Route Header Row */}
      <div style={styles.cardHeader}>
        <View style={styles.truckIconContainer}>
          <FontAwesome5 name="truck" size={18} color="#2E7D32" />
        </View>
        <Text style={styles.routeText}>
          {item.from}  <MaterialCommunityIcons name="arrow-right" size={16} color="#2E7D32" />  {item.to}
        </Text>
      </div>

      {/* Details Columns */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Item</Text>
          <View style={styles.detailValueRow}>
            <MaterialCommunityIcons name={item.itemIcon} size={20} color="#8BC34A" style={styles.valueIcon} />
            <Text style={styles.detailValue}>{item.item}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Quantity</Text>
          <View style={styles.detailValueRow}>
            <MaterialCommunityIcons name="package-variant-closed" size={18} color="#A1887F" style={styles.valueIcon} />
            <Text style={styles.detailValue}>{item.quantity}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Delivery Fee</Text>
          <View style={styles.detailValueRow}>
            <FontAwesome5 name="wallet" size={16} color="#FBC02D" style={styles.valueIcon} />
            <Text style={styles.feeValue}>{item.fee}</Text>
          </View>
        </View>
      </View>

      {/* Footer Actions Row */}
      <View style={styles.cardFooter}>
        <View style={styles.postedContainer}>
          <Ionicons name="time-outline" size={16} color="#757575" style={styles.timeIcon} />
          <Text style={styles.postedText}>Posted: {item.posted}</Text>
        </View>
        <TouchableOpacity style={styles.acceptButton} activeOpacity={0.7}>
          <Text style={styles.acceptButtonText}>Accept Job</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity><Ionicons name="person-circle-outline" size={28} color="#333" /></TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>FarmHustle </Text>
          <MaterialCommunityIcons name="leaf" size={20} color="#2E7D32" />
        </View>
        <TouchableOpacity><Ionicons name="notifications-outline" size={24} color="#333" /></TouchableOpacity>
      </View>

      {/* Title Block */}
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>Delivery Jobs</Text>
        <Text style={styles.subTitle}>Find and accept delivery jobs</Text>
      </View>

      {/* Jobs Feed */}
      <FlatList
        data={DELIVERY_JOBS}
        keyExtractor={(item) => item.id}
        renderItem={renderJobCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}