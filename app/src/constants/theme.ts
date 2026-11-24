import "@/global.css";
import { Platform } from "react-native";
import { lightColors, darkColors } from "@/lib/theme-context";

export const Colors = {
  light: lightColors,
  dark: darkColors,
} as const;

export type ThemeColor = keyof typeof lightColors;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif)",
    mono: "var(--font-mono, ui-monospace, Menlo, Monaco, Consolas, monospace)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1100;
