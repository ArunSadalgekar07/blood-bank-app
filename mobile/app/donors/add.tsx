import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";

import Colors from "@/constants/colors";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const BLOOD_TYPE_COLORS: Record<string, string> = {
  "A+": "#FF6B6B", "A-": "#FF8E8E", "B+": "#4ECDC4", "B-": "#7ED8D2",
  "AB+": "#A855F7", "AB-": "#C084FC", "O+": "#F59E0B", "O-": "#FBBF24",
};

async function createDonor(data: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/donors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create donor");
  return res.json();
}

export default function AddDonorScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const mutation = useMutation({
    mutationFn: createDonor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donors"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-donors"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to register donor. Please try again.");
    },
  });

  const handleGetLocation = async () => {
    setLocLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const [perm] = await Promise.all([Location.requestForegroundPermissionsAsync()]);
      if (!perm.granted) {
        Alert.alert("Permission Denied", "Location permission is required to use this feature.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      // Try to reverse geocode for address
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode[0]) {
          const g = geocode[0];
          const parts = [g.street, g.city, g.region].filter(Boolean);
          setAddress(parts.join(", "));
        }
      } catch {
        // Geocoding failed, that's OK
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not get location. Please try again.");
    } finally {
      setLocLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !bloodType || !phone.trim()) {
      Alert.alert("Missing Fields", "Name, blood type, and phone are required.");
      return;
    }
    mutation.mutate({
      name: name.trim(),
      bloodType,
      phone: phone.trim(),
      email: email.trim() || undefined,
      age: age ? parseInt(age) : undefined,
      latitude: coords?.latitude ?? undefined,
      longitude: coords?.longitude ?? undefined,
      address: address.trim() || undefined,
    });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <Feather name="arrow-left" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Register Donor</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Full Name *" theme={theme}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            placeholder="Enter full name"
            placeholderTextColor={theme.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </Field>

        <Field label="Blood Type *" theme={theme}>
          <View style={styles.bloodTypeGrid}>
            {BLOOD_TYPES.map((bt) => (
              <TouchableOpacity
                key={bt}
                onPress={() => { setBloodType(bt); Haptics.selectionAsync(); }}
                style={[
                  styles.btOption,
                  {
                    backgroundColor: bloodType === bt ? BLOOD_TYPE_COLORS[bt] : theme.surface,
                    borderColor: bloodType === bt ? BLOOD_TYPE_COLORS[bt] : theme.border,
                  },
                ]}
              >
                <Text style={[styles.btText, { color: bloodType === bt ? "#fff" : theme.text }]}>{bt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Phone Number *" theme={theme}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            placeholder="+1 555-000-0000"
            placeholderTextColor={theme.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </Field>

        <Field label="Email (optional)" theme={theme}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            placeholder="donor@example.com"
            placeholderTextColor={theme.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Field>

        <Field label="Age (optional)" theme={theme}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            placeholder="Enter age"
            placeholderTextColor={theme.textMuted}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />
        </Field>

        {/* Location Section */}
        <View style={[styles.locationSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.locationHeader}>
            <View style={[styles.locationIcon, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="location" size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationTitle, { color: theme.text }]}>Location</Text>
              <Text style={[styles.locationSubtitle, { color: theme.textMuted }]}>
                Helps match donors with nearby recipients
              </Text>
            </View>
          </View>

          {coords ? (
            <View style={[styles.coordsBadge, { backgroundColor: isDark ? "rgba(104,211,145,0.1)" : "#DCFCE7" }]}>
              <Ionicons name="checkmark-circle" size={16} color={isDark ? "#68D391" : "#16A34A"} />
              <Text style={[styles.coordsText, { color: isDark ? "#68D391" : "#16A34A" }]}>
                Location captured ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.locBtn, { backgroundColor: coords ? theme.backgroundSecondary : theme.primary, opacity: locLoading ? 0.7 : 1 }]}
            onPress={handleGetLocation}
            disabled={locLoading}
          >
            {locLoading ? (
              <ActivityIndicator color={coords ? theme.primary : "#fff"} size="small" />
            ) : (
              <Ionicons name="locate" size={16} color={coords ? theme.primary : "#fff"} />
            )}
            <Text style={[styles.locBtnText, { color: coords ? theme.primary : "#fff" }]}>
              {coords ? "Update Location" : "Use My Location"}
            </Text>
          </TouchableOpacity>

          {coords && (
            <Field label="Address (auto-filled)" theme={theme}>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                placeholder="Street, City, State"
                placeholderTextColor={theme.textMuted}
                value={address}
                onChangeText={setAddress}
                autoCapitalize="words"
              />
            </Field>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: mutation.isPending ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="user-plus" size={18} color="#fff" />
              <Text style={styles.submitText}>Register Donor</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, children, theme }: { label: string; children: React.ReactNode; theme: typeof Colors.light }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      {children}
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
    paddingBottom: 20,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  form: { paddingHorizontal: 20, gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  bloodTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  btOption: {
    width: 62,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  btText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  locationSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  locationHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  locationIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  locationTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  locationSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  coordsBadge: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8 },
  coordsText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  locBtn: {
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  locBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  submitBtn: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
  },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
