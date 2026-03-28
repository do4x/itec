import { Platform } from "react-native";

export const Colors = {
  navyDeep: "#0B1929",
  navyMid: "#122A45",
  navyLight: "#1A3A5C",

  itecBlue: "#2D7DD2",
  itecBright: "#4DA3FF",
  iceWhite: "#E8F1FF",

  white: "#FFFFFF",
  softGray: "#8BA4BE",
  muted: "#4A6380",

  teamRed: "#FF3B5C",
  teamCyan: "#00E5FF",
  teamGreen: "#39FF14",
  teamYellow: "#FFD600",

  success: "#00E676",
  warning: "#FFB300",
  error: "#FF1744",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 24,
  full: 9999,
} as const;

export const Typography = {
  hero: {
    fontSize: 48,
    fontWeight: "900" as const,
    letterSpacing: 6,
    textTransform: "uppercase" as const,
    color: Colors.white,
  },
  h1: {
    fontSize: 28,
    fontWeight: "800" as const,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
    color: Colors.white,
  },
  h2: {
    fontSize: 20,
    fontWeight: "800" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    color: Colors.white,
  },
  h3: {
    fontSize: 16,
    fontWeight: "700" as const,
    letterSpacing: 1,
    color: Colors.white,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    color: Colors.iceWhite,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  label: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
    color: Colors.softGray,
  },
  caption: {
    fontSize: 10,
    fontWeight: "600" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    color: Colors.muted,
  },
  stat: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.white,
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums" as const] },
      android: {},
    }),
  },
} as const;

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  }),
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
} as const;

export const CardStyle = {
  backgroundColor: Colors.navyMid,
  borderRadius: Radii.lg,
  borderWidth: 1,
  borderColor: Colors.navyLight,
  padding: Spacing.lg,
} as const;
