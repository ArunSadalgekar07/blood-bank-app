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
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";

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

interface Hospital {
  id: number;
  name: string;
  city: string;
}

async function fetchDonor(id: string): Promise<Donor> {
  const res = await fetch(`${BASE_URL}/api/donors/${id}`);
  if (!res.ok) throw new Error("Failed to fetch donor");
  return res.json();
}

async function fetchHospitals(): Promise<Hospital[]> {
  const res = await fetch(`${BASE_URL}/api/hospitals`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function recordDonation(donorId: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/donors/${donorId}/donate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to record donation");
  return res.json();
}

async function deleteDonor(id: string) {
  const res = await fetch(`${BASE_URL}/api/donors/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete donor");
  return res.json();
}

export default function DonorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [showDonate, setShowDonate] = useState(false);
  const [units, setUnits] = useState("1");
  const [notes, setNotes] = useState("");

  const { data: donor, isLoading } = useQuery({
    queryKey: ["donor", id],
    queryFn: () => fetchDonor(id!),
  });

  const { data: hospitals } = useQuery({
    queryKey: ["hospitals"],
    queryFn: fetchHospitals,
  });

  const donateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => recordDonation(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donor", id] });
      queryClient.invalidateQueries({ queryKey: ["donors"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDonate(false);
      setUnits("1");
      setNotes("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDonor(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donors"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      router.back();
    },
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (!donor) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: theme.surface }]}>
          <Feather name="arrow-left" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Donor Profile</Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Delete Donor", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
            ]);
          }}
          style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(252,129,129,0.15)" : "#FEE2E2" }]}
        >
          <Feather name="trash-2" size={18} color={isDark ? "#FC8181" : "#DC2626"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {donor.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.donorName, { color: theme.text }]}>{donor.name}</Text>
          <BloodTypeBadge bloodType={donor.bloodType} size="lg" />

          <View style={styles.statsRow}>
            <StatItem label="Donations" value={donor.totalDonations.toString()} theme={theme} />
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <StatItem label="Age" value={donor.age?.toString() ?? "-"} theme={theme} />
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <StatItem label="Status" value={donor.isEligible ? "Eligible" : "Donated"} valueColor={donor.isEligible ? (isDark ? "#68D391" : "#16A34A") : (isDark ? "#FC8181" : "#DC2626")} theme={theme} />
          </View>
        </View>

        {/* Contact Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Contact</Text>
          <InfoRow icon="phone" label="Phone" value={donor.phone} theme={theme} />
          {donor.email && <InfoRow icon="mail" label="Email" value={donor.email} theme={theme} />}
          {donor.lastDonationDate && (
            <InfoRow icon="calendar" label="Last Donation" value={donor.lastDonationDate} theme={theme} />
          )}
          <InfoRow icon="clock" label="Registered" value={new Date(donor.createdAt).toLocaleDateString()} theme={theme} />
        </View>

        {/* Record Donation */}
        {donor.isEligible && (
          <TouchableOpacity
            style={[styles.donateBtn, { backgroundColor: theme.primary }]}
            onPress={() => { setShowDonate(!showDonate); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          >
            <Feather name="plus-circle" size={20} color="#fff" />
            <Text style={styles.donateBtnText}>Record Donation</Text>
          </TouchableOpacity>
        )}

        {showDonate && (
          <View style={[styles.donateForm, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Donation Details</Text>
            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Units (bags)</Text>
            <TextInput
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              value={units}
              onChangeText={setUnits}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border, height: 80, textAlignVertical: "top", paddingTop: 12 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={theme.textMuted}
              multiline
            />
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: isDark ? "rgba(104,211,145,0.15)" : "#DCFCE7", opacity: donateMutation.isPending ? 0.7 : 1 }]}
              onPress={() => donateMutation.mutate({ units: parseInt(units) || 1, notes: notes || undefined })}
              disabled={donateMutation.isPending}
            >
              {donateMutation.isPending ? (
                <ActivityIndicator color={isDark ? "#68D391" : "#16A34A"} />
              ) : (
                <Text style={[styles.confirmText, { color: isDark ? "#68D391" : "#16A34A" }]}>Confirm Donation</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value, valueColor, theme }: { label: string; value: string; valueColor?: string; theme: typeof Colors.light }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={[{ fontSize: 20, fontFamily: "Inter_700Bold", color: valueColor ?? theme.text }]}>{value}</Text>
      <Text style={[{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textMuted, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, theme }: { icon: string; label: string; value: string; theme: typeof Colors.light }) {
  return (
    <View style={infoStyles.row}>
      <Feather name={icon as any} size={16} color={theme.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={[infoStyles.label, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[infoStyles.value, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 8 },
  label: { fontSize: 11, fontFamily: "Inter_400Regular" },
  value: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 1 },
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
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold" },
  donorName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", width: "100%", marginTop: 8 },
  statDivider: { width: 1, height: 40 },
  infoCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  donateBtn: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  donateBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  donateForm: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  formLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  formInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", borderWidth: 1 },
  confirmBtn: { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  confirmText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
