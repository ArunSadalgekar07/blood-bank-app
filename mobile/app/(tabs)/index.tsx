import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useColorScheme,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import Colors from "@/constants/colors";
import { BloodTypeBadge } from "@/components/BloodTypeBadge";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

async function fetchInventory() {
  const res = await fetch(`${BASE_URL}/api/inventory`);
  if (!res.ok) throw new Error("Failed to fetch inventory");
  return res.json() as Promise<InventoryItem[]>;
}

async function fetchAlerts() {
  const res = await fetch(`${BASE_URL}/api/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json() as Promise<Alert[]>;
}

async function fetchSummary() {
  const res = await fetch(`${BASE_URL}/api/analytics/summary`);
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json() as Promise<Summary>;
}

interface InventoryItem {
  id: number;
  bloodType: string;
  units: number;
  minThreshold: number;
  updatedAt: string;
}

interface Alert {
  bloodType: string;
  currentUnits: number;
  minThreshold: number;
  severity: string;
}

interface Summary {
  totalDonors: number;
  totalDonations: number;
  totalUnitsAvailable: number;
  pendingRequests: number;
  criticalAlerts: number;
  monthlyDonations: number;
}

function getStatusColor(units: number, threshold: number, isDark: boolean) {
  if (units === 0) return isDark ? "#FC8181" : "#E53E3E";
  if (units <= Math.floor(threshold / 2)) return isDark ? "#F6AD55" : "#DD6B20";
  if (units <= threshold) return isDark ? "#FBBF24" : "#D69E2E";
  return isDark ? "#68D391" : "#2F855A";
}

function getStatusLabel(units: number, threshold: number) {
  if (units === 0) return "Critical";
  if (units <= Math.floor(threshold / 2)) return "Low";
  if (units <= threshold) return "Limited";
  return "Sufficient";
}

export default function InventoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: inventory, isLoading: inventoryLoading, refetch: refetchInventory } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
  });

  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
  });

  const { data: summary } = useQuery({
    queryKey: ["summary"],
    queryFn: fetchSummary,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["alerts"] }),
      queryClient.invalidateQueries({ queryKey: ["summary"] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: insets.bottom + 100 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textMuted }]}>Blood Bank</Text>
          <Text style={[styles.title, { color: theme.text }]}>Inventory</Text>
        </View>
        <View style={[styles.notifBadge, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="notifications-outline" size={22} color={theme.primary} />
          {(alerts?.length ?? 0) > 0 && (
            <View style={[styles.alertDot, { backgroundColor: theme.primary }]}>
              <Text style={styles.alertDotText}>{alerts!.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Summary Cards */}
      {summary && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={styles.statsRowContent}>
          <StatCard icon="droplet" label="Total Units" value={summary.totalUnitsAvailable.toString()} color="#C0392B" theme={theme} />
          <StatCard icon="users" label="Donors" value={summary.totalDonors.toString()} color="#2B6CB0" theme={theme} />
          <StatCard icon="activity" label="This Month" value={summary.monthlyDonations.toString()} color="#276749" theme={theme} />
          <StatCard icon="alert-triangle" label="Alerts" value={summary.criticalAlerts.toString()} color="#C05621" theme={theme} />
        </ScrollView>
      )}

      {/* Alerts Banner */}
      {(alerts?.length ?? 0) > 0 && (
        <View style={[styles.alertBanner, { backgroundColor: isDark ? "rgba(192,57,43,0.15)" : "#FFF5F5", borderColor: isDark ? "rgba(192,57,43,0.3)" : "#FED7D7" }]}>
          <Ionicons name="warning-outline" size={18} color={theme.primary} />
          <Text style={[styles.alertText, { color: theme.primary }]}>
            {alerts!.length} blood type{alerts!.length > 1 ? "s" : ""} below minimum threshold
          </Text>
        </View>
      )}

      {/* Inventory Grid */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Blood Types</Text>

      {inventoryLoading ? (
        <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          {(inventory ?? []).map((item) => {
            const statusColor = getStatusColor(item.units, item.minThreshold, isDark);
            const statusLabel = getStatusLabel(item.units, item.minThreshold);
            const pct = Math.min(item.units / (item.minThreshold * 3), 1);

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.inventoryCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/inventory/[bloodType]", params: { bloodType: encodeURIComponent(item.bloodType) } });
                }}
                activeOpacity={0.7}
              >
                <BloodTypeBadge bloodType={item.bloodType} size="md" />
                <Text style={[styles.unitsText, { color: theme.text }]}>{item.units}</Text>
                <Text style={[styles.unitsLabel, { color: theme.textMuted }]}>units</Text>

                <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                  <View
                    style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: statusColor }]}
                  />
                </View>

                <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ icon, label, value, color, theme }: {
  icon: string;
  label: string;
  value: string;
  color: string;
  theme: typeof Colors.light;
}) {
  return (
    <View style={[statStyles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: `${color}15` }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[statStyles.value, { color: theme.text }]}>{value}</Text>
      <Text style={[statStyles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    width: 110,
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    gap: 6,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 22, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  notifBadge: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  alertDot: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  alertDotText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  statsRow: { marginBottom: 16 },
  statsRowContent: { paddingRight: 8 },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  alertText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  inventoryCard: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  unitsText: { fontSize: 32, fontFamily: "Inter_700Bold", marginTop: 8 },
  unitsLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressBg: { height: 4, borderRadius: 2, width: "100%", marginTop: 4 },
  progressFill: { height: 4, borderRadius: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 4 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
