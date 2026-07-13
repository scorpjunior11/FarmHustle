import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#1B3A2B" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  switch (user.role) {
    case "FARMER":
      return <Redirect href="/(farmer)" />;
    case "BUYER":
      return <Redirect href="/(buyer)" />;
    case "TRANSPORT_PROVIDER":
      return <Redirect href="/(transport)" />;
    default:
      console.warn("Unexpected or missing role on saved session:", user.role);
      return <Redirect href="/login" />;
  }
}
