import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
  useColorScheme,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import Colors from "@/constants/colors";
import { BloodTypeBadge } from "@/components/BloodTypeBadge";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface Donor {
  id: number;
  name: string;
  bloodType: string;
  phone: string;
  email?: string;
  age?: number;
  lastDonationDate?: string;
  totalDonations: number;
  isEligible: boolean;
  createdAt: string;
}

async function fetchDonors(): Promise<Donor[]> {
  const res = await fetch(`${BASE_URL}/api/donors`);
  if (!res.ok) throw new Error("Failed to fetch donors");
  return res.json();
}

export default function DonorsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: donors, isLoading } = useQuery({
    queryKey: ["donors"],
    queryFn: fetchDonors,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["donors"] });
    setRefreshing(false);
  }, [queryClient]);

  const filtered = (donors ?? []).filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.bloodType.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search)
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Blood Bank</Text>
          <Text style={[styles.title, { color: theme.text }]}>Donors</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/donors/add");
          }}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Feather name="search" size={16} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by name, blood type, phone..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
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
              <Ionicons name="people-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No donors yet</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Register the first donor to get started
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/donors/[id]", params: { id: item.id.toString() } });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={[styles.donorName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                  <BloodTypeBadge bloodType={item.bloodType} size="sm" />
                </View>
                <View style={styles.cardMeta}>
                  <Feather name="phone" size={12} color={theme.textMuted} />
                  <Text style={[styles.metaText, { color: theme.textMuted }]}>{item.phone}</Text>
                  <View style={[styles.dot, { backgroundColor: theme.border }]} />
                  <MaterialIcon name="award" count={item.totalDonations} color={theme.textMuted} />
                </View>
                {item.lastDonationDate && (
                  <Text style={[styles.lastDonation, { color: theme.textMuted }]}>
                    Last donation: {item.lastDonationDate}
                  </Text>
                )}
              </View>
              <View style={[styles.eligBadge, { backgroundColor: item.isEligible ? (isDark ? "rgba(104,211,145,0.15)" : "#DCFCE7") : (isDark ? "rgba(252,129,129,0.15)" : "#FEE2E2") }]}>
                <Text style={[styles.eligText, { color: item.isEligible ? (isDark ? "#68D391" : "#16A34A") : (isDark ? "#FC8181" : "#DC2626") }]}>
                  {item.isEligible ? "Eligible" : "Donated"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function MaterialIcon({ name, count, color }: { name: string; count: number; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Feather name="heart" size={12} color={color} />
      <Text style={{ fontSize: 12, color, fontFamily: "Inter_400Regular" }}>{count} donations</Text>
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 20, gap: 12 },
  card: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardBody: { flex: 1, gap: 4 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  donorName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  lastDonation: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  eligBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  eligText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
