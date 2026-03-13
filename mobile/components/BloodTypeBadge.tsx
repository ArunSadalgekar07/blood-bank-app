import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import Colors from "@/constants/colors";

const BLOOD_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "A+": { bg: "#FF6B6B", text: "#fff" },
  "A-": { bg: "#FF8E8E", text: "#fff" },
  "B+": { bg: "#4ECDC4", text: "#fff" },
  "B-": { bg: "#7ED8D2", text: "#fff" },
  "AB+": { bg: "#A855F7", text: "#fff" },
  "AB-": { bg: "#C084FC", text: "#fff" },
  "O+": { bg: "#F59E0B", text: "#fff" },
  "O-": { bg: "#FBBF24", text: "#1a1a1a" },
};

type Props = {
  bloodType: string;
  size?: "sm" | "md" | "lg";
};

export function BloodTypeBadge({ bloodType, size = "md" }: Props) {
  const colors = BLOOD_TYPE_COLORS[bloodType] ?? { bg: "#6B7280", text: "#fff" };
  const sizeStyle = size === "sm" ? styles.sm : size === "lg" ? styles.lg : styles.md;
  const textSize = size === "sm" ? styles.textSm : size === "lg" ? styles.textLg : styles.textMd;

  return (
    <View style={[styles.badge, sizeStyle, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, textSize, { color: colors.text }]}>{bloodType}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sm: { paddingHorizontal: 8, paddingVertical: 3 },
  md: { paddingHorizontal: 12, paddingVertical: 5 },
  lg: { paddingHorizontal: 16, paddingVertical: 8 },
  text: { fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  textSm: { fontSize: 11 },
  textMd: { fontSize: 14 },
  textLg: { fontSize: 18 },
});
