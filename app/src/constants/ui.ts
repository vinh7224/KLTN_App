import { StyleSheet, Platform } from "react-native";
import { ThemeColors, darkColors, lightColors } from "@/lib/theme-context";

// Fallback constant matching user Dark Mode specification
export const C = {
  bg: darkColors.background,
  card: darkColors.surface,
  cardElevated: darkColors.surfaceSubtle,
  line: darkColors.border,
  border: darkColors.border,
  text: darkColors.text,
  sub: darkColors.textSecondary,
  muted: darkColors.textSecondary,
  accent: darkColors.accent,
  cyan: darkColors.accent,
  ok: darkColors.success,
  success: darkColors.success,
  bad: darkColors.error,
  danger: darkColors.error,
  warning: darkColors.warning,
  amber: darkColors.warning,
};

// Minimalist Modern UI Style Factory
export const createThemedStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: 16,
      gap: 16,
      maxWidth: 1100,
      width: "100%",
      alignSelf: "center",
    },
    // Minimalist Card: Clean surface, 1px subtle border, gentle corner radius
    card: {
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      gap: 12,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
    text: {
      color: c.text,
      fontSize: 14,
      lineHeight: 20,
    },
    sub: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    muted: {
      color: c.textSecondary,
      fontSize: 12,
    },
    mono: {
      fontFamily: Platform.select({ ios: "Menlo", default: "monospace", web: "monospace" }),
    },
    // Form Inputs
    input: {
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      borderWidth: 1,
      borderColor: c.border,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
    },
    // Minimalist Buttons
    btn: {
      backgroundColor: c.accent,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
    },
    btnText: {
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 14,
    },
    btnSecondary: {
      backgroundColor: c.surface,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: "row",
      gap: 8,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
    },
    btnDanger: {
      backgroundColor: c.error,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
  });

// Static backward-compatible ui object
export const ui = createThemedStyles(darkColors);
