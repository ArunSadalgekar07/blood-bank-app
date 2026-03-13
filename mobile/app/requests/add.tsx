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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
const URGENCY_LEVELS = [
  { value: "low", label: "Low", color: "#16A34A" },
  { value: "normal", label: "Normal", color: "#2563EB" },
  { value: "high", label: "High", color: "#D97706" },
  { value: "critical", label: "Critical", color: "#DC2626" },
];

interface Hospital { id: number; name: string; city: string; }

async function fetchHospitals(): Promise<Hospital[]> {
  const res = await fetch(`${BASE_URL}/api/hospitals`);
  if (!res.ok) return [];
  return res.json();
}

async function createRequest(data: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create request");
  return res.json();
}

export default function AddRequestScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [patientName, setPatientName] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [units, setUnits] = useState("1");
  const [urgency, setUrgency] = useState("normal");
  const [hospitalId, setHospitalId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const { data: hospitals } = useQuery({ queryKey: ["hospitals"], queryFn: fetchHospitals });

  const mutation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to create request. Please try again.");
    },
  });

  const handleSubmit = () => {
    if (!patientName.trim() || !bloodType || !units) {
      Alert.alert("Missing Fields", "Patient name, blood type, and units are required.");
      return;
    }
    mutation.mutate({
      patientName: patientName.trim(),
      bloodType,
      units: parseInt(units) || 1,
      urgency,
      hospitalId: hospitalId ?? undefined,
      notes: notes.trim() || undefined,
    });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <Feather name="arrow-left" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>New Blood Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Patient Name *" theme={theme}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            placeholder="Enter patient name"
            placeholderTextColor={theme.textMuted}
            value={patientName}
            onChangeText={setPatientName}
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

        <Field label="Units Required *" theme={theme}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            placeholder="1"
            placeholderTextColor={theme.textMuted}
            value={units}
            onChangeText={setUnits}
            keyboardType="number-pad"
          />
        </Field>

        <Field label="Urgency Level *" theme={theme}>
          <View style={styles.urgencyRow}>
            {URGENCY_LEVELS.map((u) => (
              <TouchableOpacity
                key={u.value}
                onPress={() => { setUrgency(u.value); Haptics.selectionAsync(); }}
                style={[
                  styles.urgencyOption,
                  {
                    backgroundColor: urgency === u.value ? `${u.color}20` : theme.surface,
                    borderColor: urgency === u.value ? u.color : theme.border,
                  },
                ]}
              >
                <Text style={[styles.urgencyText, { color: urgency === u.value ? u.color : theme.textSecondary }]}>{u.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {(hospitals ?? []).length > 0 && (
          <Field label="Hospital (optional)" theme={theme}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setHospitalId(null)}
                  style={[styles.hospitalPill, { backgroundColor: hospitalId === null ? theme.primaryLight : theme.surface, borderColor: hospitalId === null ? theme.primary : theme.border }]}
                >
                  <Text style={[styles.hospitalText, { color: hospitalId === null ? theme.primary : theme.textSecondary }]}>None</Text>
                </TouchableOpacity>
                {(hospitals ?? []).map((h) => (
                  <TouchableOpacity
                    key={h.id}
                    onPress={() => { setHospitalId(h.id); Haptics.selectionAsync(); }}
                    style={[styles.hospitalPill, { backgroundColor: hospitalId === h.id ? theme.primaryLight : theme.surface, borderColor: hospitalId === h.id ? theme.primary : theme.border }]}
                  >
                    <Text style={[styles.hospitalText, { color: hospitalId === h.id ? theme.primary : theme.textSecondary }]}>{h.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Field>
        )}

        <Field label="Notes (optional)" theme={theme}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, height: 80, textAlignVertical: "top", paddingTop: 14 }]}
            placeholder="Additional notes..."
            placeholderTextColor={theme.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Field>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: mutation.isPending ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="file-plus" size={18} color="#fff" />
              <Text style={styles.submitText}>Submit Request</Text>
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  bloodTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  btOption: { width: 62, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  btText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  urgencyRow: { flexDirection: "row", gap: 8 },
  urgencyOption: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1.5 },
  urgencyText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  hospitalPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  hospitalText: { fontSize: 13, fontFamily: "Inter_500Medium" },
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
