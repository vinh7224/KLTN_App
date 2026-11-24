import React from "react";
import { View, Text, Switch, StyleSheet, Platform } from "react-native";
import { useMonitor } from "@/lib/monitor";
import { useAppTheme } from "@/lib/theme-context";

export function MonitorSwitch() {
  const { enabled, toggleMonitor } = useMonitor();
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.textContainer}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.indicatorDot,
              {
                backgroundColor: enabled ? colors.success : colors.textSecondary,
              },
            ]}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            {enabled ? "Đang nhận dữ liệu trực tiếp" : "Đang tắt, không đọc dữ liệu"}
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {enabled
            ? "WebSocket đang mở và cập nhật telemetry mỗi giây"
            : "Chế độ an toàn: không có kết nối mạng nào được mở"}
        </Text>
      </View>

      <View style={styles.switchWrapper}>
        <Switch
          value={enabled}
          onValueChange={toggleMonitor}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={Platform.OS === "android" ? (enabled ? "#FFFFFF" : "#F1F5F9") : undefined}
          accessibilityLabel="Công tắc bật tắt giám sát điện năng"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 56,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  switchWrapper: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});

