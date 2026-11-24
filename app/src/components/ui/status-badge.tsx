import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/lib/theme-context";

export type StatusVariant =
  | "online"
  | "offline"
  | "stale"
  | "warning"
  | "danger"
  | "info"
  | "success"
  | "connecting"
  | "neutral"
  | "primary";

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  pulse?: boolean; // kept for compatibility
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const { colors, isDark } = useAppTheme();

  const getStatusConfig = () => {
    switch (status) {
      case "online":
      case "success":
        return {
          color: colors.success,
          bg: isDark ? "rgba(74, 222, 128, 0.12)" : "rgba(22, 163, 74, 0.1)",
          defaultLabel: "Hoạt động",
        };
      case "offline":
      case "danger":
        return {
          color: colors.error,
          bg: isDark ? "rgba(248, 113, 113, 0.12)" : "rgba(220, 38, 38, 0.1)",
          defaultLabel: "Mất kết nối",
        };
      case "stale":
      case "warning":
        return {
          color: colors.warning,
          bg: isDark ? "rgba(251, 191, 36, 0.12)" : "rgba(217, 119, 6, 0.1)",
          defaultLabel: "Dữ liệu cũ",
        };
      case "neutral":
        return {
          color: colors.textSecondary,
          bg: isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(100, 116, 139, 0.1)",
          defaultLabel: "Bình thường",
        };
      case "primary":
      case "connecting":
      case "info":
      default:
        return {
          color: colors.accent,
          bg: isDark ? "rgba(96, 165, 250, 0.12)" : "rgba(37, 99, 235, 0.1)",
          defaultLabel: "Đang kết nối",
        };
    }
  };

  const config = getStatusConfig();
  const text = label || config.defaultLabel;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "500",
  },
});
