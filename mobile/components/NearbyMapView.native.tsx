import React from "react";
import { StyleSheet, View, Text } from "react-native";
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from "react-native-maps";
import Colors from "@/constants/colors";

const BLOOD_TYPE_COLORS: Record<string, string> = {
  "A+": "#FF6B6B", "A-": "#FF8E8E", "B+": "#4ECDC4", "B-": "#7ED8D2",
  "AB+": "#A855F7", "AB-": "#C084FC", "O+": "#F59E0B", "O-": "#FBBF24",
};

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
  mapRef: React.RefObject<MapView | null>;
  theme: typeof Colors.light;
}

export default function NearbyMapView({
  userLocation,
  donors,
  radius,
  selectedDonorId,
  onSelectDonor,
  isDark,
  mapRef,
  theme,
}: Props) {
  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_DEFAULT}
      initialRegion={{
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }}
      showsUserLocation
      showsMyLocationButton={false}
      userInterfaceStyle={isDark ? "dark" : "light"}
    >
      <Circle
        center={userLocation}
        radius={radius * 1000}
        strokeColor={`${theme.primary}60`}
        fillColor={`${theme.primary}10`}
        strokeWidth={1.5}
      />
      {donors.map((donor) => {
        if (!donor.latitude || !donor.longitude) return null;
        const color = BLOOD_TYPE_COLORS[donor.bloodType] ?? theme.primary;
        const isSelected = selectedDonorId === donor.id;
        return (
          <Marker
            key={donor.id}
            coordinate={{ latitude: donor.latitude, longitude: donor.longitude }}
            onPress={() => onSelectDonor(donor)}
            tracksViewChanges={false}
          >
            <View
              style={[
                styles.markerWrap,
                {
                  backgroundColor: color,
                  borderColor: isSelected ? "#fff" : "rgba(255,255,255,0.6)",
                  transform: [{ scale: isSelected ? 1.2 : 1 }],
                },
              ]}
            >
              <Text style={styles.markerText}>{donor.bloodType}</Text>
            </View>
            <View style={[styles.markerTail, { borderTopColor: color }]} />
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  markerWrap: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 2,
    minWidth: 42,
    alignItems: "center",
  },
  markerText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    alignSelf: "center",
  },
});
