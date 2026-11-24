import React, { useState, useMemo } from "react";
import {
  FlatList,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRefreshMs } from "@/hooks/use-refresh";
import { useMonitor } from "@/lib/monitor";
import { StatusBadge } from "@/components/ui/status-badge";
import { SystemHeader } from "@/components/ui/system-header";
import { MonitorSwitch } from "@/components/monitor-switch";
import { useAppTheme } from "@/lib/theme-context";

interface KindInfo {
  label: string;
  severity: "danger" | "warning" | "info";
  unit: string;
}

const KIND_NAMES: Record<string, KindInfo> = {
  over_power: { label: "Quá công suất", severity: "danger", unit: "W" },
  over_current: { label: "Quá dòng", severity: "danger", unit: "A" },
  voltage: { label: "Điện áp bất thường", severity: "warning", unit: "V" },
  over_voltage: { label: "Quá áp lưới điện", severity: "warning", unit: "V" },
  under_voltage: { label: "Thấp áp lưới điện", severity: "warning", unit: "V" },
  over_forecast: { label: "Nghi quên tắt thiết bị", severity: "warning", unit: "W" },
  night_load: { label: "Tiêu thụ bất thường ban đêm", severity: "warning", unit: "W" },
  relay_cmd: { label: "Lệnh rơ-le", severity: "info", unit: "" },
};

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "over_power", label: "Quá công suất" },
  { id: "over_current", label: "Quá dòng" },
  { id: "voltage", label: "Điện áp" },
  { id: "anomaly", label: "Bất thường AI" },
  { id: "relay_cmd", label: "Lệnh rơ-le" },
];

export default function Alerts() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { colors } = useAppTheme();
  const { enabled } = useMonitor();
  const refresh = useRefreshMs();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["events"],
    queryFn: () => api<any[]>("/events"),
    enabled: enabled,
    refetchInterval: enabled ? refresh : false,
  });

  // Filter events
  const filteredEvents = useMemo(() => {
    return data.filter((e) => {
      if (selectedFilter === "voltage") {
        if (!e.kind.includes("voltage")) return false;
      } else if (selectedFilter === "anomaly") {
        if (e.kind !== "over_forecast" && e.kind !== "night_load") return false;
      } else if (selectedFilter !== "all") {
        if (e.kind !== selectedFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const label = (KIND_NAMES[e.kind]?.label ?? e.kind).toLowerCase();
        const note = (e.note ?? "").toLowerCase();
        const dev = (e.device_id ?? "").toLowerCase();
        if (!label.includes(q) && !note.includes(q) && !dev.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [data, selectedFilter, searchQuery]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SystemHeader
        title="🔔 Cảnh báo & Sự kiện"
        subtitle="Nhật ký vi phạm ngưỡng an toàn, phát hiện bất thường AI và lệnh điều khiển"
      />

      <View style={[styles.mainContainer, isMobile && styles.mainContainerMobile]}>
        {/* MONITOR SWITCH COMPONENT */}
        <MonitorSwitch />

        {/* IF MONITORING IS OFF */}
        {!enabled ? (
          <View
            style={[
              styles.disabledCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.disabledBadge,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.disabledBadgeText, { color: colors.textSecondary }]}>
                Đang tắt giám sát
              </Text>
            </View>
            <Text style={[styles.disabledTitle, { color: colors.text }]}>
              Bật giám sát để xem dữ liệu
            </Text>
            <Text style={[styles.disabledDesc, { color: colors.textSecondary }]}>
              Nhật ký cảnh báo quá tải, bất thường phụ tải và trạng thái đóng ngắt đang tạm dừng cập nhật.
            </Text>
          </View>
        ) : (
          <>
            {/* SEARCH AND FILTER BAR */}
            <View style={styles.controlsBar}>
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Tìm kiếm sự kiện, thiết bị, ghi chú..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScrollView}
                contentContainerStyle={styles.filterScroll}
              >
                {FILTERS.map((f) => {
                  const active = f.id === selectedFilter;
                  return (
                    <Pressable
                      key={f.id}
                      style={[
                        styles.segmentBtn,
                        active
                          ? {
                              backgroundColor: colors.accent,
                              borderColor: colors.accent,
                            }
                          : {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                      ]}
                      onPress={() => setSelectedFilter(f.id)}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          { color: active ? "#FFFFFF" : colors.textSecondary },
                          active && { fontWeight: "600" },
                        ]}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* EVENTS LIST */}
            <FlatList
              style={styles.list}
              contentContainerStyle={styles.listContent}
              data={filteredEvents}
              keyExtractor={(e, index) =>
                e.id != null
                  ? String(e.id)
                  : `${e.detected_at ?? e.cmd_sent_at ?? 0}-${e.kind ?? "event"}-${index}`
              }
              refreshing={isLoading}
              onRefresh={refetch}
              ListEmptyComponent={
                <View
                  style={[
                    styles.emptyContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                    Không có sự kiện cảnh báo nào phù hợp
                  </Text>
                </View>
              }
              renderItem={({ item: e }) => {
                const info = KIND_NAMES[e.kind] ?? {
                  label: e.kind,
                  severity: "info" as const,
                  unit: "",
                };

                const isRelay = e.kind === "relay_cmd";
                const isAnomaly = e.kind === "over_forecast" || e.kind === "night_load";
                const eventTime = new Date((e.detected_at ?? e.cmd_sent_at) * 1000).toLocaleString("vi-VN");

                return (
                  <View
                    style={[
                      styles.eventCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <Text style={[styles.eventTitle, { color: colors.text }]}>{info.label}</Text>
                        <Text style={[styles.eventDevice, { color: colors.textSecondary }]}>
                          Thiết bị: {e.device_id ?? "esp32-01"}
                        </Text>
                      </View>

                      <StatusBadge
                        status={
                          info.severity === "danger"
                            ? "danger"
                            : info.severity === "warning"
                            ? "warning"
                            : "info"
                        }
                        label={
                          info.severity === "danger"
                            ? "Nguy cấp"
                            : isAnomaly
                            ? "AI phát hiện"
                            : info.severity === "warning"
                            ? "Cảnh báo"
                            : "Nhật ký"
                        }
                      />
                    </View>

                    {/* Measurements vs Threshold */}
                    {e.value != null && (
                      <View
                        style={[
                          styles.metricBox,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.metricText, { color: colors.text }]}>
                          Đo được: <Text style={{ fontWeight: "600" }}>{e.value}{info.unit}</Text>
                        </Text>
                        {e.threshold != null && (
                          <>
                            <Text style={[styles.metricDivider, { color: colors.border }]}>·</Text>
                            <Text style={[styles.metricText, { color: colors.textSecondary }]}>
                              Ngưỡng: {e.threshold}{info.unit}
                            </Text>
                            {e.value > e.threshold && (
                              <>
                                <Text style={[styles.metricDivider, { color: colors.border }]}>·</Text>
                                <Text style={[styles.metricText, { color: colors.error }]}>
                                  Vượt: +{Math.round((e.value - e.threshold) * 10) / 10}{info.unit}
                                </Text>
                              </>
                            )}
                          </>
                        )}
                      </View>
                    )}

                    {/* Relay Specific Feedback */}
                    {isRelay && (
                      <View
                        style={[
                          styles.metricBox,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.relayStatusText,
                            {
                              color:
                                e.verified === 1
                                  ? colors.success
                                  : e.verified === 0
                                  ? colors.error
                                  : colors.textSecondary,
                            },
                          ]}
                        >
                          {e.verified === 1
                            ? "✓ Tiếp điểm phụ đã xác nhận khớp lệnh"
                            : e.verified === 0
                            ? "⚠️ Cảnh báo: Tiếp điểm phụ không khớp lệnh"
                            : "⏳ Đang chờ phản hồi tiếp điểm phụ..."}
                        </Text>
                        {e.cmd_id && (
                          <Text style={[styles.cmdText, { color: colors.textSecondary }]}>
                            · Lệnh #{e.cmd_id}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Footer */}
                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                      <Text style={[styles.timeText, { color: colors.textSecondary }]}>{eventTime}</Text>
                      {e.note && (
                        <Text style={[styles.noteText, { color: colors.textSecondary }]}>{e.note}</Text>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    padding: 16,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
    gap: 12,
  },
  mainContainerMobile: {
    padding: 12,
    gap: 10,
  },
  disabledCard: {
    padding: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  disabledBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  disabledBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  disabledTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabledDesc: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 400,
    lineHeight: 18,
  },
  controlsBar: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  searchInput: {
    width: "100%",
    minHeight: 38,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  filterScrollView: {
    width: "100%",
  },
  filterScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  segmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  eventCard: {
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    gap: 2,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  eventDevice: {
    fontSize: 11,
  },
  metricBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6,
  },
  metricText: {
    fontSize: 12,
  },
  metricDivider: {
    fontSize: 12,
  },
  relayStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  cmdText: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timeText: {
    fontSize: 11,
  },
  noteText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 13,
  },
});
