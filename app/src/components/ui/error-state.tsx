import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useAppTheme } from "@/lib/theme-context";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "Lỗi kết nối máy chủ",
  message = "Không thể tải dữ liệu từ API Backend. Vui lòng kiểm tra lại kết nối mạng hoặc địa chỉ máy chủ.",
  onRetry,
  retryLabel = "Thử lại",
}: ErrorStateProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.error,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: colors.error }]}>
        <Text style={styles.badgeText}>ERROR</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {onRetry && (
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.error }]}
          onPress={onRetry}
        >
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  message: {
    fontSize: 12,
    textAlign: "center",
    maxWidth: 400,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
