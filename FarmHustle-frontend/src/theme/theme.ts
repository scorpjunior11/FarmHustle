import type { ViewStyle } from "react-native";

/**
 * Single source of truth for FarmHustle's visual design.
 * Import `THEME` anywhere and pull from colors / radius / spacing / shadow.
 */

const colors = {
  primary: "#2E7D32",
  primaryDark: "#256628",
  accent: "#F9A825",
  accentText: "#3A2C00",
  bg: "#FFFFFF",
  surface: "#F7F9F7",
  card: "#FFFFFF",
  text: "#1A1A1A",
  textMuted: "#7A857F",
  border: "#ECECEC",
  success: "#2E7D32",
  danger: "#C62828",
  white: "#FFFFFF",
} as const;

const radius = {
  sm: 10,
  md: 14,
  lg: 20,
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

// Reusable soft card shadow (iOS shadow* + Android elevation). Spread into a style.
const shadow: ViewStyle = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

export const THEME = {
  colors,
  radius,
  spacing,
  shadow,
} as const;

export type Theme = typeof THEME;
