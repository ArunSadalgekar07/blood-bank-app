import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import Colors from "@/constants/colors";

type UrgencyLevel = "critical" | "high" | "normal" | "low";

type Props = {
  urgency: string;
  size?: "sm" | "md";
};

export function UrgencyBadge({ urgency, size = "md" }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const getColors = () => {
    switch (urgency.toLowerCase()) {
      case "critical":
        return { bg: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2", text: isDark ? "#FC8181" : "#DC2626" };
      case "high":
        return { bg: isDark ? "rgba(245,158,11,0.2)" : "#FEF3C7", text: isDark ? "#FBBF24" : "#D97706" };
      case "normal":
        return { bg: isDark ? "rgba(59,130,246,0.2)" : "#DBEAFE", text: isDark ? "#60A5FA" : "#2563EB" };
      case "low":
        return { bg: isDark ? "rgba(34,197,94,0.2)" : "#DCFCE7", text: isDark ? "#4ADE80" : "#16A34A" };
      default:
        return { bg: theme.backgroundSecondary, text: theme.textSecondary };
    }
  };

  const colors = getColors();
  const label = urgency.charAt(0).toUpperCase() + urgency.slice(1).toLowerCase();

  return (
    <View style={[styles.badge, size === "sm" ? styles.sm : styles.md, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, size === "sm" ? styles.textSm : styles.textMd, { color: colors.text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 6, alignItems: "center", justifyContent: "center" },
  sm: { paddingHorizontal: 8, paddingVertical: 2 },
  md: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  textSm: { fontSize: 11 },
  textMd: { fontSize: 12 },
});
