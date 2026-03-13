import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useColorScheme,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { BloodTypeBadge } from "@/components/BloodTypeBadge";
import NearbyMapView from "@/components/NearbyMapView";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const BLOOD_TYPES = ["All", "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const RADII = [10, 25, 50, 100];

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

interface UserLocation {
  latitude: number;
  longitude: number;
}

async function fetchNearbyDonors(lat: number, lon: number, radius: number, bloodType?: string): Promise<Donor[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
  });
  if (bloodType && bloodType !== "All") params.set("bloodType", bloodType);
  const res = await fetch(`${BASE_URL}/api/donors/nearby?${params}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function NearbyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);

  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedBloodType, setSelectedBloodType] = useState("All");
  const [radius, setRadius] = useState(50);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  const getLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      setUserLocation({ latitude: 15.8497, longitude: 74.4977 }); // Belagavi, Karnataka
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (permission?.granted) {
      getLocation();
    }
  }, [permission?.granted]);

  const { data: nearbyDonors, isLoading } = useQuery({
    queryKey: ["nearby-donors", userLocation?.latitude, userLocation?.longitude, radius, selectedBloodType],
    queryFn: () =>
      userLocation
        ? fetchNearbyDonors(userLocation.latitude, userLocation.longitude, radius, selectedBloodType === "All" ? undefined : selectedBloodType)
        : Promise.resolve([]),
    enabled: !!userLocation,
  });

  const handleSelectDonor = useCallback((donor: Donor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDonor(donor);
    if (donor.latitude && donor.longitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: donor.latitude - 0.005,
        longitude: donor.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    }
  }, []);

  const handleCenterOnMe = useCallback(() => {
    if (userLocation && mapRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      mapRef.current.animateToRegion({ ...userLocation, latitudeDelta: 0.1, longitudeDelta: 0.1 }, 500);
    }
  }, [userLocation]);

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background, paddingTop: topPad }]}>
        <View style={[styles.permCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={[styles.permIconWrap, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="location" size={36} color={theme.primary} />
          </View>
          <Text style={[styles.permTitle, { color: theme.text }]}>Location Access Needed</Text>
          <Text style={[styles.permDesc, { color: theme.textSecondary }]}>
            Allow location access to find blood donors near you and connect with them quickly.
          </Text>
          {!permission.canAskAgain && Platform.OS !== "web" ? (
            <TouchableOpacity
              style={[styles.permBtn, { backgroundColor: theme.primary }]}
              onPress={() => { try { Linking.openSettings(); } catch {} }}
            >
              <Feather name="settings" size={18} color="#fff" />
              <Text style={styles.permBtnText}>Open Settings</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.permBtn, { backgroundColor: theme.primary }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); requestPermission(); }}
            >
              <Ionicons name="location-outline" size={18} color="#fff" />
              <Text style={styles.permBtnText}>Allow Location</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header overlay on map */}
      <View style={[styles.headerOverlay, { paddingTop: topPad }]}>
        <View style={[styles.headerCard, { backgroundColor: theme.surface }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>Blood Bank</Text>
              <Text style={[styles.title, { color: theme.text }]}>Nearby Donors</Text>
            </View>
            {locationLoading ? (
              <ActivityIndicator color={theme.primary} size="small" />
            ) : (
              <Text style={[styles.countText, { color: theme.primary }]}>
                {(nearbyDonors ?? []).length} found
              </Text>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
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
                <Text style={[styles.filterChipText, { color: selectedBloodType === bt ? "#fff" : theme.textSecondary }]}>
                  {bt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.radiusRow}>
            <Text style={[styles.radiusLabel, { color: theme.textMuted }]}>Radius:</Text>
            {RADII.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => { setRadius(r); Haptics.selectionAsync(); }}
                style={[
                  styles.radiusChip,
                  {
                    backgroundColor: radius === r ? theme.primaryLight : "transparent",
                    borderColor: radius === r ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.radiusChipText, { color: radius === r ? theme.primary : theme.textMuted }]}>
                  {r}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Map */}
      {userLocation ? (
        <NearbyMapView
          mapRef={mapRef}
          userLocation={userLocation}
          donors={nearbyDonors ?? []}
          radius={radius}
          selectedDonorId={selectedDonor?.id ?? null}
          onSelectDonor={(d) => handleSelectDonor(d as Donor)}
          isDark={isDark}
          theme={theme}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundSecondary, alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Getting your location...</Text>
        </View>
      )}

      {/* Center on me button */}
      {userLocation && (
        <TouchableOpacity
          style={[styles.locationBtn, { backgroundColor: theme.surface }]}
          onPress={handleCenterOnMe}
        >
          <Ionicons name="locate" size={22} color={theme.primary} />
        </TouchableOpacity>
      )}

      {/* Selected donor card */}
      {selectedDonor && (
        <View style={[styles.donorCard, { backgroundColor: theme.surface, bottom: insets.bottom + 100 }]}>
          <TouchableOpacity style={styles.closeCard} onPress={() => setSelectedDonor(null)}>
            <Feather name="x" size={16} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={styles.donorCardInner}>
            <View style={[styles.donorAvatar, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.donorAvatarText, { color: theme.primary }]}>
                {selectedDonor.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.donorNameRow}>
                <Text style={[styles.donorName, { color: theme.text }]}>{selectedDonor.name}</Text>
                <BloodTypeBadge bloodType={selectedDonor.bloodType} size="sm" />
              </View>
              {selectedDonor.distanceKm != null && (
                <View style={styles.distRow}>
                  <Ionicons name="location-outline" size={13} color={theme.textMuted} />
                  <Text style={[styles.distText, { color: theme.textMuted }]}>
                    {selectedDonor.distanceKm < 1
                      ? `${Math.round(selectedDonor.distanceKm * 1000)}m away`
                      : `${selectedDonor.distanceKm.toFixed(1)}km away`}
                  </Text>
                </View>
              )}
              {selectedDonor.address && (
                <Text style={[styles.addressText, { color: theme.textMuted }]} numberOfLines={1}>
                  {selectedDonor.address}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.donorCardActions}>
            <View style={[
              styles.eligBadge,
              { backgroundColor: selectedDonor.isEligible ? (isDark ? "rgba(104,211,145,0.15)" : "#DCFCE7") : (isDark ? "rgba(252,129,129,0.15)" : "#FEE2E2") }
            ]}>
              <Text style={[styles.eligText, { color: selectedDonor.isEligible ? (isDark ? "#68D391" : "#16A34A") : (isDark ? "#FC8181" : "#DC2626") }]}>
                {selectedDonor.isEligible ? "Eligible to donate" : "Recently donated"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: theme.primary }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Linking.openURL(`tel:${selectedDonor.phone}`); }}
            >
              <Feather name="phone" size={14} color="#fff" />
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Horizontal donor pills */}
      {!selectedDonor && (nearbyDonors ?? []).length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.nearbyList, { bottom: insets.bottom + 100 }]}
          contentContainerStyle={styles.nearbyListContent}
        >
          {(nearbyDonors ?? []).slice(0, 10).map((donor) => (
            <TouchableOpacity
              key={donor.id}
              onPress={() => handleSelectDonor(donor)}
              style={[styles.nearbyPill, { backgroundColor: theme.surface }]}
            >
              <View style={[styles.pillDot, { backgroundColor: BLOOD_TYPE_COLORS[donor.bloodType] ?? theme.primary }]}>
                <Text style={styles.pillDotText}>{donor.bloodType}</Text>
              </View>
              <View>
                <Text style={[styles.pillName, { color: theme.text }]} numberOfLines={1}>{donor.name}</Text>
                {donor.distanceKm != null && (
                  <Text style={[styles.pillDist, { color: theme.textMuted }]}>
                    {donor.distanceKm < 1 ? `${Math.round(donor.distanceKm * 1000)}m` : `${donor.distanceKm.toFixed(1)}km`}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Empty state */}
      {!isLoading && userLocation && (nearbyDonors ?? []).length === 0 && (
        <View style={[styles.emptyOverlay, { bottom: insets.bottom + 120 }]}>
          <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="map-marker-off" size={28} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No donors within {radius}km</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  headerOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerCard: {
    borderRadius: 20, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 5, gap: 10,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  countText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  filterScroll: { marginTop: 2 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 6 },
  filterChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  radiusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  radiusLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  radiusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  radiusChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  locationBtn: {
    position: "absolute", right: 16, bottom: 200,
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  donorCard: {
    position: "absolute", left: 16, right: 16, borderRadius: 20, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 8, gap: 12,
  },
  closeCard: {
    position: "absolute", top: 12, right: 12,
    width: 28, height: 28, alignItems: "center", justifyContent: "center",
  },
  donorCardInner: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  donorAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  donorAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  donorNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  donorName: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
  distRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  distText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  addressText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  donorCardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eligBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  eligText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  callBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12,
  },
  callBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  nearbyList: { position: "absolute", left: 0, right: 0 },
  nearbyListContent: { paddingHorizontal: 16, gap: 8 },
  nearbyPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  pillDot: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pillDotText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  pillName: { fontSize: 13, fontFamily: "Inter_600SemiBold", maxWidth: 90 },
  pillDist: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyOverlay: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  emptyCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  permCard: {
    borderRadius: 24, padding: 28, alignItems: "center", gap: 14,
    borderWidth: 1, width: "100%", maxWidth: 360,
  },
  permIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  permTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  permDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  permBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16,
    marginTop: 8, width: "100%", justifyContent: "center",
  },
  permBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
