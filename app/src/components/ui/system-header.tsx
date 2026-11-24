import React from "react";
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from "react-native";
import { useAppTheme, ThemeMode } from "@/lib/theme-context";
import { useLive } from "@/hooks/use-live";

interface SystemHeaderProps {
  title: string;
  subtitle?: string;
}

export function SystemHeader({ title, subtitle }: SystemHeaderProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { colors, theme, setTheme } = useAppTheme();
  const { connected, stale, latencyMs, reconnect } = useLive();
  const online = connected && !stale;

  const cycleTheme = () => {
    const next: ThemeMode = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
  };

  const themeLabel = theme === "system" ? "Tự động" : theme === "light" ? "Sáng" : "Tối";

  return (
    <View
      style={[
        styles.header,
        isMobile && styles.headerMobile,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.titleCol, isMobile && styles.titleColMobile]}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && !isMobile && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={[styles.actionsRow, isMobile && styles.actionsRowMobile]}>
        {/* Connection status dot & latency */}
        <Pressable
          style={[styles.statusChip, { borderColor: colors.border }]}
          onPress={reconnect}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: online
                  ? colors.success
                  : connected
                  ? colors.warning
                  : colors.error,
              },
            ]}
          />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {online
              ? isMobile
                ? "Online"
                : `Trực tuyến ${latencyMs != null ? `(${latencyMs}ms)` : ""}`
              : connected
              ? "Chậm"
              : "Mất kết nối"}
          </Text>
        </Pressable>

        {/* Theme mode toggle button */}
        <Pressable
          style={[
            styles.themeBtn,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
            },
          ]}
          onPress={cycleTheme}
        >
          <Text style={[styles.themeBtnText, { color: colors.text }]}>
            {isMobile ? `Theme: ${themeLabel}` : `Giao diện: ${themeLabel}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  titleCol: {
    flex: 1,
    minWidth: 200,
  },
  titleColMobile: {
    minWidth: 140,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionsRowMobile: {
    gap: 6,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  themeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  themeBtnText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
