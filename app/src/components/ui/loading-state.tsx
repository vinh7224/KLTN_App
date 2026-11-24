import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useAppTheme } from "@/lib/theme-context";

interface LoadingStateProps {
  message?: string;
  height?: number;
}

export function LoadingState({
  message = "Đang tải dữ liệu...",
  height = 140,
}: LoadingStateProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.border,
          minHeight: height,
        },
      ]}
    >
      <ActivityIndicator size="small" color={colors.accent} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {message}
      </Text>
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
    gap: 12,
    marginVertical: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
});
