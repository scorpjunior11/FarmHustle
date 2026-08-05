import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";

// The backend sends title/body only today (no data payload) — see
// PushNotificationService.sendNotification. Once it starts including a
// `route` hint, this is the contract to add: data.route ===
// "farmer-orders" | "buyer-orders". Until then every tap falls back to the
// recipient's own orders screen, which is the correct destination for all 6
// currently-wired notifications anyway.
function routeFromResponse(response: Notifications.NotificationResponse, role: string | undefined) {
  const data = response.notification.request.content.data as { route?: string } | undefined;

  if (data?.route === "farmer-orders") {
    router.push("/(farmer)/orders");
    return;
  }
  if (data?.route === "buyer-orders") {
    router.push("/(buyer)/orders");
    return;
  }

  if (role === "FARMER") {
    router.push("/(farmer)/orders");
  } else if (role === "BUYER") {
    router.push("/(buyer)/orders");
  }
  // TRANSPORT_PROVIDER / unknown: none of the 6 wired notifications target
  // this role today, so there's nowhere sensible to send a bare tap.
}

// Registers app-wide notification-tap handling: a cold start via
// getLastNotificationResponseAsync() (app was launched BY the tap), and a
// live listener for taps while the app is already running/backgrounded.
export function useNotificationTapRouting() {
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && !cancelled) {
        routeFromResponse(response, user?.role);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromResponse(response, user?.role);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [user?.role]);
}
