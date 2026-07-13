import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getDeliveries, updateProfilePhoto } from "../../api/client";
import { uploadImageToCloudinary } from "../../api/uploadImage";
import { useAuth } from "../../context/AuthContext";

const THEME = {
  deepGreen: "#1B3A2B",
  accent: "#2F7A4D",
  white: "#FFFFFF",
  bgLight: "#F4F7F5",
};

function formatMemberSince(createdAt: string | null | undefined): string {
  if (!createdAt) return "—";
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function TransportProfileScreen() {
  const { user, setUser } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [statCount, setStatCount] = useState(0);
  const [statLoading, setStatLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStatLoading(false);
      return;
    }
    let cancelled = false;
    setStatLoading(true);
    getDeliveries()
      .then((deliveries) => {
        if (!cancelled) {
          setStatCount(
            deliveries.filter((d) => d.provider?.id === user.id && d.status === "DELIVERED").length
          );
        }
      })
      .catch(() => {
        if (!cancelled) setStatCount(0);
      })
      .finally(() => {
        if (!cancelled) setStatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handlePickAvatar = async () => {
    if (!user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to change your photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || result.assets.length === 0 || !result.assets[0].base64) {
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await uploadImageToCloudinary(result.assets[0].base64);
      await updateProfilePhoto(user.id, url);
      setUser({ ...user, profilePhotoUrl: url });
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out?", "You'll need to log in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          setUser(null);
          router.replace("/login");
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="log-in-outline" size={40} color="#9E9E9E" />
          <Text style={styles.emptyText}>Please log in to see your profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingPhoto} activeOpacity={0.85}>
            {user.profilePhotoUrl ? (
              <Image
                source={{ uri: user.profilePhotoUrl }}
                style={styles.avatarImage}
                accessibilityLabel="Your profile photo"
              />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={44} color={THEME.accent} />
              </View>
            )}
            {uploadingPhoto ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={THEME.white} size="small" />
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editBadge}
            onPress={handlePickAvatar}
            disabled={uploadingPhoto}
            accessibilityLabel="Change profile photo"
            accessibilityRole="button"
          >
            <Ionicons name="camera" size={13} color={THEME.white} />
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>{user.name}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>Transport provider</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statLoading ? "–" : statCount}</Text>
          <Text style={styles.statLabel}>deliveries done</Text>
        </View>

        <View style={styles.infoCard}>
          <InfoRow icon="call-outline" value={user.phone} />
          <InfoRow icon="mail-outline" value={user.email} />
          <InfoRow icon="location-outline" value={user.city} />
          <InfoRow icon="calendar-outline" value={`Member since ${formatMemberSince(user.createdAt)}`} />
        </View>

        <TouchableOpacity
          style={styles.historyRow}
          onPress={() => router.push("/delivery-history")}
          activeOpacity={0.7}
        >
          <View style={styles.historyLeft}>
            <Ionicons name="time-outline" size={18} color={THEME.accent} />
            <Text style={styles.historyText}>Delivery history</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#C62828" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={THEME.accent} />
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.deepGreen },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingTop: 60,
  },
  emptyText: { fontSize: 14, color: "#757575", textAlign: "center", paddingHorizontal: 32 },

  body: { alignItems: "center", padding: 24 },

  avatarWrap: { marginTop: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E8F5E9",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 48,
    backgroundColor: "rgba(27,58,43,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.accent,
    borderWidth: 2,
    borderColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
  },

  name: { fontSize: 20, fontWeight: "800", color: THEME.deepGreen, marginTop: 14 },
  rolePill: {
    backgroundColor: THEME.bgLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  rolePillText: { fontSize: 12, fontWeight: "700", color: THEME.accent },

  statCard: {
    alignSelf: "stretch",
    backgroundColor: THEME.deepGreen,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    marginTop: 22,
  },
  statValue: { fontSize: 28, fontWeight: "800", color: THEME.white },
  statLabel: { fontSize: 13, color: "#A9C3B3", marginTop: 4 },

  infoCard: {
    alignSelf: "stretch",
    backgroundColor: THEME.bgLight,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginTop: 16,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoValue: { fontSize: 14, color: "#212121" },

  historyRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.bgLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 12,
  },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  historyText: { fontSize: 14, fontWeight: "600", color: "#212121" },

  logoutBtn: {
    alignSelf: "stretch",
    marginTop: 24,
    backgroundColor: "#FDECEA",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#C62828" },
});
