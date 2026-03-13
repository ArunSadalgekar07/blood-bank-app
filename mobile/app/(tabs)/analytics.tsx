import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useColorScheme,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather, Ionicons } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { BloodTypeBadge } from "@/components/BloodTypeBadge";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Summary {
  totalDonors: number;
  totalDonations: number;
  totalUnitsAvailable: number;
  totalRequests: number;
  pendingRequests: number;
  criticalAlerts: number;
  monthlyDonations: number;
}

interface Trend {
  month: string;
  donations: number;
  units: number;
}

interface InventoryItem {
  bloodType: string;
  units: number;
  minThreshold: number;
}

async function fetchSummary(): Promise<Summary> {
  const res = await fetch(`${BASE_URL}/api/analytics/summary`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchTrends(): Promise<Trend[]> {
  const res = await fetch(`${BASE_URL}/api/analytics/trends`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await fetch(`${BASE_URL}/api/inventory`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery({ queryKey: ["summary"], queryFn: fetchSummary });
  const { data: trends, isLoading: trendsLoading } = useQuery({ queryKey: ["trends"], queryFn: fetchTrends });
  const { data: inventory } = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["summary"] }),
      queryClient.invalidateQueries({ queryKey: ["trends"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;
  const maxDonations = Math.max(...(trends ?? []).map((t) => t.donations), 1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: insets.bottom + 100 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Blood Bank</Text>
      <Text style={[styles.title, { color: theme.text }]}>Analytics</Text>

      {/* Summary Grid */}
      {summary && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
          <View style={styles.summaryGrid}>
            <SummaryCard icon="users" label="Total Donors" value={summary.totalDonors} color="#C0392B" theme={theme} />
            <SummaryCard icon="activity" label="Donations" value={summary.totalDonations} color="#2B6CB0" theme={theme} />
            <SummaryCard icon="droplet" label="Units Available" value={summary.totalUnitsAvailable} color="#276749" theme={theme} />
            <SummaryCard icon="file-text" label="Total Requests" value={summary.totalRequests} color="#744210" theme={theme} />
            <SummaryCard icon="clock" label="Pending" value={summary.pendingRequests} color="#C05621" theme={theme} />
            <SummaryCard icon="calendar" label="This Month" value={summary.monthlyDonations} color="#553C9A" theme={theme} />
          </View>
        </>
      )}

      {/* Donation Trends Chart */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Donation Trends</Text>
      <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        {trendsLoading ? (
          <ActivityIndicator color={theme.primary} size="small" style={{ paddingVertical: 30 }} />
        ) : (trends ?? []).length === 0 ? (
          <View style={styles.emptyChart}>
            <Feather name="bar-chart" size={32} color={theme.textMuted} />
            <Text style={[styles.emptyChartText, { color: theme.textMuted }]}>No donation data yet</Text>
          </View>
        ) : (
          <View style={styles.chart}>
            {(trends ?? []).map((t, i) => {
              const barH = Math.max((t.donations / maxDonations) * 120, 4);
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={[styles.barValue, { color: theme.text }]}>{t.donations}</Text>
                  <View style={[styles.bar, { height: barH, backgroundColor: theme.primary }]} />
                  <Text style={[styles.barLabel, { color: theme.textMuted }]}>{t.month}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Inventory Distribution */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Blood Type Distribution</Text>
      <View style={[styles.distributionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        {(inventory ?? []).map((item) => {
          const total = (inventory ?? []).reduce((s, i) => s + i.units, 0);
          const pct = total > 0 ? (item.units / total) * 100 : 0;
          const isLow = item.units <= item.minThreshold;
          return (
            <View key={item.bloodType} style={styles.distRow}>
              <BloodTypeBadge bloodType={item.bloodType} size="sm" />
              <View style={[styles.distBar, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.distFill,
                    {
                      width: `${Math.max(pct, 1)}%` as any,
                      backgroundColor: isLow ? theme.danger : theme.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.distPct, { color: theme.text }]}>{item.units}u</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function SummaryCard({ icon, label, value, color, theme }: {
  icon: string;
  label: string;
  value: number;
  color: string;
  theme: typeof Colors.light;
}) {
  return (
    <View style={[cardStyles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
      <View style={[cardStyles.icon, { backgroundColor: `${color}15` }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text style={[cardStyles.value, { color: theme.text }]}>{value}</Text>
      <Text style={[cardStyles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 24, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 4 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 16, marginBottom: 12 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6, paddingTop: 8 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  barValue: { fontSize: 11, fontFamily: "Inter_500Medium" },
  bar: { width: "80%", borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyChart: { alignItems: "center", gap: 8, paddingVertical: 30 },
  emptyChartText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  distributionCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  distRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  distBar: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  distFill: { height: 8, borderRadius: 4 },
  distPct: { width: 36, fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right" },
});
