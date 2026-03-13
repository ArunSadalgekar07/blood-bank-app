import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Donor {
  id: number;
  name: string;
  bloodType: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
}

interface Props {
  userLocation: { latitude: number; longitude: number };
  donors: Donor[];
  radius: number;
  selectedDonorId: number | null;
  onSelectDonor: (donor: Donor) => void;
  isDark: boolean;
  mapRef: React.RefObject<null>;
  theme: typeof Colors.light;
}

export default function NearbyMapView({ theme }: Props) {
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.backgroundSecondary }]}>
      <Ionicons name="map-outline" size={48} color={theme.textMuted} />
      <Text style={[styles.text, { color: theme.textMuted }]}>
        Map view available in Expo Go
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
