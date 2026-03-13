import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { BloodTypeBadge } from "@/components/BloodTypeBadge";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const BLOOD_TYPES = ["All", "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

const BLOOD_TYPE_COLORS: Record<string, string> = {
  "A+": "#FF6B6B", "A-": "#FF8E8E", "B+": "#4ECDC4", "B-": "#7ED8D2",
  "AB+": "#A855F7", "AB-": "#C084FC", "O+": "#F59E0B", "O-": "#FBBF24",
};

interface Donor {
  id: number;
  name: string;
  bloodType: string;
  phone: string;
  isEligible: boolean;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  distanceKm: number | null;
  totalDonations: number;
}

async function fetchNearbyDonors(lat: number, lon: number, radius: number, bloodType?: string): Promise<Donor[]> {
  const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString(), radius: radius.toString() });
  if (bloodType && bloodType !== "All") params.set("bloodType", bloodType);
  const res = await fetch(`${BASE_URL}/api/donors/nearby?${params}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchAllDonors(): Promise<Donor[]> {
  const res = await fetch(`${BASE_URL}/api/donors`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function NearbyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [selectedBloodType, setSelectedBloodType] = useState("All");
  const [radius, setRadius] = useState(50);

  // Default to Belagavi, Karnataka, India for web (no device location API)
  const defaultLat = 15.8497;
  const defaultLon = 74.4977;

  const { data: donors, isLoading } = useQuery({
    queryKey: ["nearby-donors-web", radius, selectedBloodType],
    queryFn: () => fetchNearbyDonors(defaultLat, defaultLon, radius, selectedBloodType === "All" ? undefined : selectedBloodType),
  });

  const topPad = 67;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Blood Bank</Text>
          <Text style={[styles.title, { color: theme.text }]}>Nearby Donors</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="people" size={14} color={theme.primary} />
          <Text style={[styles.countText, { color: theme.primary }]}>{(donors ?? []).length} donors</Text>
        </View>
      </View>

      {/* Web Map Notice */}
      <View style={[styles.mapNotice, { backgroundColor: isDark ? "rgba(192,57,43,0.12)" : "#FFF5F5", borderColor: isDark ? "rgba(192,57,43,0.3)" : "#FECACA" }]}>
        <Ionicons name="phone-portrait-outline" size={18} color={theme.primary} />
        <Text style={[styles.mapNoticeText, { color: isDark ? "#FC8181" : "#C0392B" }]}>
          Interactive map is available in the Expo Go mobile app
        </Text>
      </View>

      {/* Blood Type Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterBar, { backgroundColor: theme.surface }]} contentContainerStyle={styles.filterBarContent}>
        {BLOOD_TYPES.map((bt) => (
          <TouchableOpacity
            key={bt}
            onPress={() => { setSelectedBloodType(bt); Haptics.selectionAsync(); }}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedBloodType === bt
                  ? (bt === "All" ? theme.primary : (BLOOD_TYPE_COLORS[bt] ?? theme.primary))
                  : theme.backgroundSecondary,
                borderColor: selectedBloodType === bt
                  ? (bt === "All" ? theme.primary : (BLOOD_TYPE_COLORS[bt] ?? theme.primary))
                  : theme.border,
              },
            ]}
          >
            <Text style={[styles.filterChipText, { color: selectedBloodType === bt ? "#fff" : theme.textSecondary }]}>{bt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Radius row */}
      <View style={[styles.radiusBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.radiusLabel, { color: theme.textMuted }]}>Search radius:</Text>
        {[10, 25, 50, 100].map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => { setRadius(r); Haptics.selectionAsync(); }}
            style={[styles.radiusChip, { backgroundColor: radius === r ? theme.primaryLight : "transparent", borderColor: radius === r ? theme.primary : theme.border }]}
          >
            <Text style={[styles.radiusChipText, { color: radius === r ? theme.primary : theme.textMuted }]}>{r}km</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (donors ?? []).length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="map-marker-off" size={40} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No donors found</Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>Try expanding the search radius or changing the blood type filter</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 34 }]} showsVerticalScrollIndicator={false}>
          {(donors ?? []).map((donor) => (
            <DonorCard key={donor.id} donor={donor} theme={theme} isDark={isDark} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function DonorCard({ donor, theme, isDark }: { donor: Donor; theme: typeof Colors.light; isDark: boolean }) {
  const color = BLOOD_TYPE_COLORS[donor.bloodType] ?? theme.primary;
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
      <View style={[styles.cardLeft, { backgroundColor: color + "20" }]}>
        <Text style={[styles.cardBT, { color }]}>{donor.bloodType}</Text>
        {donor.distanceKm != null && (
          <Text style={[styles.cardDist, { color: theme.textMuted }]}>
            {donor.distanceKm < 1 ? `${Math.round(donor.distanceKm * 1000)}m` : `${donor.distanceKm.toFixed(1)}km`}
          </Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardNameRow}>
          <Text style={[styles.cardName, { color: theme.text }]}>{donor.name}</Text>
          <View style={[styles.eligBadge, { backgroundColor: donor.isEligible ? (isDark ? "rgba(104,211,145,0.15)" : "#DCFCE7") : (isDark ? "rgba(252,129,129,0.15)" : "#FEE2E2") }]}>
            <Text style={[styles.eligText, { color: donor.isEligible ? (isDark ? "#68D391" : "#16A34A") : (isDark ? "#FC8181" : "#DC2626") }]}>
              {donor.isEligible ? "Eligible" : "Donated"}
            </Text>
          </View>
        </View>
        {donor.address && (
          <View style={styles.addrRow}>
            <Ionicons name="location-outline" size={13} color={theme.textMuted} />
            <Text style={[styles.addrText, { color: theme.textMuted }]} numberOfLines={1}>{donor.address}</Text>
          </View>
        )}
        <View style={styles.cardActions}>
          <Text style={[styles.donationsText, { color: theme.textMuted }]}>
            {donor.totalDonations} donation{donor.totalDonations !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: theme.primary }]}
            onPress={() => Linking.openURL(`tel:${donor.phone}`)}
          >
            <Feather name="phone" size={13} color="#fff" />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  countBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  countText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  mapNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  mapNoticeText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  filterBar: { borderBottomWidth: 0, marginTop: 12 },
  filterBarContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  radiusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  radiusLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  radiusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  radiusChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  cardLeft: { width: 72, alignItems: "center", justifyContent: "center", padding: 10, gap: 4 },
  cardBT: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cardDist: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cardBody: { flex: 1, padding: 14, gap: 6 },
  cardNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  eligBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  eligText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  addrText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  donationsText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  callBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  callBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
