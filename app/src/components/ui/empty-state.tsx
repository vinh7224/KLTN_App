import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useAppTheme } from "@/lib/theme-context";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  height?: number;
}

export function EmptyState({
  title = "Không có dữ liệu",
  description = "Hiện tại chưa có bản ghi hoặc sự kiện nào trong khoảng thời gian này.",
  actionLabel,
  onAction,
  height,
}: EmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.border,
          minHeight: height ?? 140,
        },
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: colors.border }]} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {actionLabel && onAction && (
        <Pressable
          style={[styles.actionBtn, { borderColor: colors.accent, backgroundColor: colors.surface }]}
          onPress={onAction}
        >
          <Text style={[styles.actionText, { color: colors.accent }]}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 8,
  },
  indicator: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  description: {
    fontSize: 12,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
