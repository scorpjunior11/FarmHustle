import { useEffect, useRef, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getOrdersByFarmer } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const ACTIVE_COLOR = "#1B3A2B";
const INACTIVE_COLOR = "#9E9E9E";
const POLL_INTERVAL_MS = 45000;

export default function FarmerLayout() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!user) return;

    const fetchPendingCount = async () => {
      try {
        const orders = await getOrdersByFarmer(user.id);
        if (mountedRef.current) {
          setPendingCount(orders.filter((o) => o.status === "PENDING").length);
        }
      } catch {
        // silently ignore — badge just stays at its last known value
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: { backgroundColor: "#FFFFFF" },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "leaf" : "leaf-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
