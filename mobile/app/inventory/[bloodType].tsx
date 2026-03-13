import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";

import Colors from "@/constants/colors";
import { BloodTypeBadge } from "@/components/BloodTypeBadge";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface InventoryItem {
  id: number;
  bloodType: string;
  units: number;
  minThreshold: number;
  updatedAt: string;
}

async function fetchInventoryItem(bloodType: string): Promise<InventoryItem> {
  const res = await fetch(`${BASE_URL}/api/inventory/${encodeURIComponent(bloodType)}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function updateInventory(bloodType: string, units: number, minThreshold?: number) {
  const res = await fetch(`${BASE_URL}/api/inventory/${encodeURIComponent(bloodType)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ units, minThreshold }),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

export default function InventoryDetailScreen() {
  const { bloodType: rawBloodType } = useLocalSearchParams<{ bloodType: string }>();
  const bloodType = decodeURIComponent(rawBloodType ?? "");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [units, setUnits] = useState("");
  const [threshold, setThreshold] = useState("");

  const { data: item, isLoading } = useQuery({
    queryKey: ["inventory-item", bloodType],
    queryFn: () => fetchInventoryItem(bloodType),
  });

  const mutation = useMutation({
    mutationFn: ({ u, t }: { u: number; t?: number }) => updateInventory(bloodType, u, t),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-item", bloodType] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditMode(false);
    },
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  const handleEdit = () => {
    if (item) {
      setUnits(item.units.toString());
      setThreshold(item.minThreshold.toString());
      setEditMode(true);
    }
  };

  const handleSave = () => {
    const u = parseInt(units);
    const t = parseInt(threshold);
    if (isNaN(u) || u < 0) {
      Alert.alert("Invalid", "Please enter a valid unit count.");
      return;
    }
    mutation.mutate({ u, t: isNaN(t) ? undefined : t });
  };

  const getStatusColor = () => {
    if (!item) return theme.textMuted;
    if (item.units === 0) return isDark ? "#FC8181" : "#E53E3E";
    if (item.units <= Math.floor(item.minThreshold / 2)) return isDark ? "#F6AD55" : "#DD6B20";
    if (item.units <= item.minThreshold) return isDark ? "#FBBF24" : "#D69E2E";
    return isDark ? "#68D391" : "#2F855A";
  };

  const getStatusLabel = () => {
    if (!item) return "";
    if (item.units === 0) return "Critical - Urgent Needed";
    if (item.units <= Math.floor(item.minThreshold / 2)) return "Very Low";
    if (item.units <= item.minThreshold) return "Below Threshold";
    return "Sufficient Stock";
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (!item) return null;

  const pct = Math.min(item.units / (item.minThreshold * 3), 1);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: theme.surface }]}>
          <Feather name="arrow-left" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Blood Inventory</Text>
        <TouchableOpacity
          onPress={editMode ? handleSave : handleEdit}
          style={[styles.iconBtn, { backgroundColor: editMode ? theme.primary : theme.surface }]}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={editMode ? "#fff" : theme.text} size="small" />
          ) : (
            <Feather name={editMode ? "check" : "edit-2"} size={18} color={editMode ? "#fff" : theme.text} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <BloodTypeBadge bloodType={bloodType} size="lg" />
          <Text style={[styles.unitsHero, { color: theme.text }]}>{item.units}</Text>
          <Text style={[styles.unitsLabel, { color: theme.textMuted }]}>units available</Text>

          <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: getStatusColor() }]} />
          </View>

          <View style={[styles.statusPill, { backgroundColor: `${getStatusColor()}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusLabel()}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Details</Text>

          {editMode ? (
            <>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Current Units</Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                value={units}
                onChangeText={setUnits}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
              />
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Minimum Threshold</Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                value={threshold}
                onChangeText={setThreshold}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor={theme.textMuted}
              />
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => setEditMode(false)}
              >
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <InfoRow icon="droplet" label="Available Units" value={`${item.units} units`} theme={theme} />
              <InfoRow icon="alert-circle" label="Min Threshold" value={`${item.minThreshold} units`} theme={theme} />
              <InfoRow icon="trending-up" label="Stock Level" value={`${Math.round(pct * 100)}% of optimal`} theme={theme} />
              <InfoRow icon="clock" label="Last Updated" value={new Date(item.updatedAt).toLocaleString()} theme={theme} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, theme }: { icon: string; label: string; value: string; theme: typeof Colors.light }) {
  return (
    <View style={rowStyles.row}>
      <View style={[rowStyles.iconWrap, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name={icon as any} size={16} color={theme.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.label, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[rowStyles.value, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, fontFamily: "Inter_400Regular" },
  value: { fontSize: 15, fontFamily: "Inter_500Medium", marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, gap: 16 },
  heroCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  unitsHero: { fontSize: 64, fontFamily: "Inter_700Bold", lineHeight: 72 },
  unitsLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  progressBg: { height: 6, borderRadius: 3, width: "100%", marginTop: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  statusPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  statusText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 8 },
  fieldInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    marginTop: 4,
  },
  cancelBtn: { height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, marginTop: 8 },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
