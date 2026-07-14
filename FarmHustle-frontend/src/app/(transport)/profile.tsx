import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getDeliveries, updateProfilePhoto } from "../../api/client";
import { uploadImageToCloudinary } from "../../api/uploadImage";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../theme/theme";

const { colors } = THEME;
const HAIRLINE = "#EEEEEE";

const cardShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} as const;

function formatMemberSince(createdAt: string | null | undefined): string {
  if (!createdAt) return "—";
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function TransportProfileScreen() {
  const { user, setUser } = useAuth();
  const insets = useSafeAreaInsets();
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
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Profile</Text>
        </View>
        <View style={styles.notLoggedBody}>
          <View style={styles.centered}>
            <Ionicons name="log-in-outline" size={40} color="#9E9E9E" />
            <Text style={styles.emptyText}>Please log in to see your profile.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 68 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Green header banner (inside the scroll so the avatar can overlap it) */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Profile</Text>
        </View>

        <View style={styles.content}>
          {/* Avatar overlapping the banner */}
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
                  <Ionicons name="person" size={44} color={colors.primary} />
                </View>
              )}
              {uploadingPhoto ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={colors.white} size="small" />
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
              <Ionicons name="camera" size={13} color={colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>Transport provider</Text>
          </View>

          {/* Stat card */}
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statLoading ? "–" : statCount}</Text>
            <Text style={styles.statLabel}>deliveries done</Text>
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <InfoRow icon="call-outline" value={user.phone} />
            <View style={styles.infoDivider} />
            <InfoRow icon="mail-outline" value={user.email} />
            <View style={styles.infoDivider} />
            <InfoRow icon="location-outline" value={user.city} />
            <View style={styles.infoDivider} />
            <InfoRow icon="calendar-outline" value={`Member since ${formatMemberSince(user.createdAt)}`} />
          </View>

          {/* History link */}
          <TouchableOpacity
            style={styles.historyRow}
            onPress={() => router.push("/delivery-history")}
            activeOpacity={0.7}
          >
            <View style={styles.historyLeft}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.historyText}>Delivery history</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  scroll: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 32 },
  content: { alignItems: "center", paddingHorizontal: 20 },
  notLoggedBody: { flex: 1, backgroundColor: colors.bg },

  // Green banner
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 52,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerTitle: { fontSize: 22, fontWeight: "800", color: colors.white },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingTop: 60,
  },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: "center", paddingHorizontal: 32 },

  // Avatar (overlaps banner)
  avatarWrap: { marginTop: -48 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: colors.bg,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E8F5E9",
    borderWidth: 4,
    borderColor: colors.bg,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  name: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 12 },
  rolePill: {
    backgroundColor: "#FDF3D8",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 8,
  },
  rolePillText: { fontSize: 12, fontWeight: "800", color: colors.accentText, letterSpacing: 0.3 },

  // Stat card (green)
  statCard: {
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: "center",
    marginTop: 22,
    ...cardShadow,
  },
  statValue: { fontSize: 30, fontWeight: "800", color: colors.white },
  statLabel: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },

  // Info card
  infoCard: {
    alignSelf: "stretch",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HAIRLINE,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 16,
    ...cardShadow,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  infoValue: { fontSize: 14, color: colors.text, flex: 1 },
  infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: HAIRLINE },

  // History row
  historyRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HAIRLINE,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 14,
    ...cardShadow,
  },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  historyText: { fontSize: 14, fontWeight: "700", color: colors.text },

  // Logout
  logoutBtn: {
    alignSelf: "stretch",
    marginTop: 20,
    backgroundColor: "#FDECEA",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: colors.danger },
});
