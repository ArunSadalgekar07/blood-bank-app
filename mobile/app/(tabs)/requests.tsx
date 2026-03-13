import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import Colors from "@/constants/colors";
import { BloodTypeBadge } from "@/components/BloodTypeBadge";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { StatusBadge } from "@/components/StatusBadge";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface BloodRequest {
  id: number;
  patientName: string;
  bloodType: string;
  units: number;
  urgency: string;
  status: string;
  hospitalName?: string;
  notes?: string;
  requestedAt: string;
  fulfilledAt?: string;
}

async function fetchRequests(): Promise<BloodRequest[]> {
  const res = await fetch(`${BASE_URL}/api/requests`);
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

async function updateRequest({ id, status }: { id: number; status: string }) {
  const res = await fetch(`${BASE_URL}/api/requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update request");
  return res.json();
}

const FILTERS = ["All", "Pending", "Fulfilled", "Cancelled"];

export default function RequestsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: fetchRequests,
  });

  const mutation = useMutation({
    mutationFn: updateRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["requests"] });
    setRefreshing(false);
  }, [queryClient]);

  const filtered = (requests ?? []).filter((r) => {
    if (filter === "All") return true;
    return r.status.toLowerCase() === filter.toLowerCase();
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Blood Bank</Text>
          <Text style={[styles.title, { color: theme.text }]}>Requests</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/requests/add");
          }}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === f ? theme.primary : theme.surface,
                borderColor: filter === f ? theme.primary : theme.border,
              },
            ]}
          >
            <Text style={[styles.filterText, { color: filter === f ? "#fff" : theme.textSecondary }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No requests</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Blood requests will appear here
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <View style={styles.patientRow}>
                  <View style={[styles.patientIcon, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="person" size={16} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.patientName, { color: theme.text }]}>{item.patientName}</Text>
                    {item.hospitalName && (
                      <Text style={[styles.hospitalText, { color: theme.textMuted }]}>{item.hospitalName}</Text>
                    )}
                  </View>
                  <StatusBadge status={item.status} />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <BloodTypeBadge bloodType={item.bloodType} size="sm" />
                  <View style={[styles.unitsBadge, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="droplet" size={12} color={theme.textSecondary} />
                    <Text style={[styles.unitsText, { color: theme.textSecondary }]}>{item.units} units</Text>
                  </View>
                  <UrgencyBadge urgency={item.urgency} size="sm" />
                </View>
                <Text style={[styles.dateText, { color: theme.textMuted }]}>
                  Requested: {formatDate(item.requestedAt)}
                </Text>
              </View>

              {item.status === "pending" && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(104,211,145,0.15)" : "#DCFCE7" }]}
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      mutation.mutate({ id: item.id, status: "fulfilled" });
                    }}
                  >
                    <Feather name="check" size={14} color={isDark ? "#68D391" : "#16A34A"} />
                    <Text style={[styles.actionText, { color: isDark ? "#68D391" : "#16A34A" }]}>Fulfill</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(252,129,129,0.15)" : "#FEE2E2" }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      mutation.mutate({ id: item.id, status: "cancelled" });
                    }}
                  >
                    <Feather name="x" size={14} color={isDark ? "#FC8181" : "#DC2626"} />
                    <Text style={[styles.actionText, { color: isDark ? "#FC8181" : "#DC2626" }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  addButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { paddingHorizontal: 20, gap: 12 },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardHeader: { padding: 14 },
  patientRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  patientIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  patientName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  hospitalText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: 1 },
  cardBody: { padding: 14, gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  unitsBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  unitsText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
