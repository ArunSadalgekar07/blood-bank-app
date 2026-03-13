import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import Colors from "@/constants/colors";

type Props = {
  status: string;
};

export function StatusBadge({ status }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const getColors = () => {
    switch (status.toLowerCase()) {
      case "fulfilled":
        return { bg: isDark ? "rgba(34,197,94,0.2)" : "#DCFCE7", text: isDark ? "#4ADE80" : "#16A34A" };
      case "pending":
        return { bg: isDark ? "rgba(245,158,11,0.2)" : "#FEF3C7", text: isDark ? "#FBBF24" : "#D97706" };
      case "cancelled":
        return { bg: isDark ? "rgba(107,114,128,0.2)" : "#F3F4F6", text: isDark ? "#9CA3AF" : "#6B7280" };
      default:
        return { bg: theme.backgroundSecondary, text: theme.textSecondary };
    }
  };

  const colors = getColors();
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.3 },
});
