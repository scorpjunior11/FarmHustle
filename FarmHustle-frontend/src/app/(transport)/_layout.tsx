import { useEffect, useRef, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDeliveries } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const ACTIVE_COLOR = "#1B3A2B";
const INACTIVE_COLOR = "#9E9E9E";
const POLL_INTERVAL_MS = 45000;

export default function TransportLayout() {
  const { user } = useAuth();
  const [openJobsCount, setOpenJobsCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!user) return;

    const fetchOpenJobsCount = async () => {
      try {
        const deliveries = await getDeliveries();
        if (mountedRef.current) {
          setOpenJobsCount(deliveries.filter((d) => d.status === "REQUESTED").length);
        }
      } catch {
        // silently ignore — badge just stays at its last known value
      }
    };

    fetchOpenJobsCount();
    const interval = setInterval(fetchOpenJobsCount, POLL_INTERVAL_MS);
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
          title: "Available",
          tabBarBadge: openJobsCount > 0 ? openJobsCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "list" : "list-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="negotiating"
        options={{
          title: "Negotiate",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: "Active",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "car" : "car-outline"} size={24} color={color} />
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
