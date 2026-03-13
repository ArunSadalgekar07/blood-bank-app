const crimsonRed = "#C0392B";
const bloodRed = "#E74C3C";
const darkNavy = "#0D1B2A";
const navyMid = "#1B2B3F";
const navyLight = "#243447";
const surfaceDark = "#162030";

export default {
  light: {
    text: "#0D1B2A",
    textSecondary: "#4A5568",
    textMuted: "#718096",
    background: "#F7F9FC",
    backgroundSecondary: "#EDF2F7",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    border: "#E2E8F0",
    tint: crimsonRed,
    tabIconDefault: "#A0AEC0",
    tabIconSelected: crimsonRed,
    primary: crimsonRed,
    primaryLight: "#FDEAEA",
    danger: "#E53E3E",
    warning: "#DD6B20",
    success: "#2F855A",
    successLight: "#F0FFF4",
    warningLight: "#FFFAF0",
    dangerLight: "#FFF5F5",
    cardBorder: "#E2E8F0",
    shadow: "rgba(0,0,0,0.08)",
  },
  dark: {
    text: "#F7FAFC",
    textSecondary: "#CBD5E0",
    textMuted: "#718096",
    background: darkNavy,
    backgroundSecondary: surfaceDark,
    surface: navyMid,
    surfaceElevated: navyLight,
    border: "#2D3748",
    tint: bloodRed,
    tabIconDefault: "#4A5568",
    tabIconSelected: bloodRed,
    primary: bloodRed,
    primaryLight: "rgba(231, 76, 60, 0.15)",
    danger: "#FC8181",
    warning: "#F6AD55",
    success: "#68D391",
    successLight: "rgba(104, 211, 145, 0.15)",
    warningLight: "rgba(246, 173, 85, 0.15)",
    dangerLight: "rgba(252, 129, 129, 0.15)",
    cardBorder: "#2D3748",
    shadow: "rgba(0,0,0,0.3)",
  },
};
