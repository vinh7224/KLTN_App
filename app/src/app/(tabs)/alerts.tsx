import React, { useState, useMemo } from "react";
import {
  FlatList,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRefreshMs } from "@/hooks/use-refresh";
import { useMonitor } from "@/lib/monitor";
import { StatusBadge } from "@/components/ui/status-badge";
import { SystemHeader } from "@/components/ui/system-header";
import { MonitorSwitch } from "@/components/monitor-switch";
import { StatCard } from "@/components/stat-card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
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
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["events"],
    queryFn: () => api<any[]>("/events"),
    enabled: enabled,
    refetchInterval: enabled ? refresh : false,
  });

  // Calculate statistics from backend data
  const stats = useMemo(() => {
    let dangerCount = 0;
    let warningCount = 0;
    let aiCount = 0;

    for (const e of data) {
      const info = KIND_NAMES[e.kind];
      if (info?.severity === "danger") dangerCount++;
      if (info?.severity === "warning") warningCount++;
      if (e.kind === "over_forecast" || e.kind === "night_load") aiCount++;
    }

    return {
      total: data.length,
      danger: dangerCount,
      warning: warningCount,
      ai: aiCount,
    };
  }, [data]);

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
        title="Cảnh báo & Sự kiện"
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
            {/* STATS OVERVIEW CARDS */}
            <View style={styles.statsRow}>
              <StatCard
                label="Tổng sự kiện"
                value={stats.total}
                unit="bản ghi"
                digits={0}
                secondaryInfo="Lưu trữ trong CSDL"
                status="normal"
              />
              <StatCard
                label="Cảnh báo nguy cấp"
                value={stats.danger}
                unit="lần"
                digits={0}
                secondaryInfo="Quá tải, quá dòng"
                status={stats.danger > 0 ? "danger" : "good"}
              />
              <StatCard
                label="Cảnh báo thông thường"
                value={stats.warning}
                unit="lần"
                digits={0}
                secondaryInfo="Dao động điện áp"
                status={stats.warning > 0 ? "warning" : "good"}
              />
              <StatCard
                label="Bất thường AI"
                value={stats.ai}
                unit="phát hiện"
                digits={0}
                secondaryInfo="Đêm muộn, vượt forecast"
                status={stats.ai > 0 ? "warning" : "normal"}
              />
            </View>

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

            {/* ERROR STATE */}
            {isError ? (
              <ErrorState
                title="Lỗi tải danh sách sự kiện"
                message={(error as any)?.message || "Không thể tải dữ liệu từ endpoint /events."}
                onRetry={() => refetch()}
              />
            ) : isLoading && !data.length ? (
              <LoadingState message="Đang tải nhật ký sự kiện..." height={200} />
            ) : (
              /* EVENTS LIST */
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
                  <EmptyState
                    title="Không có sự kiện phù hợp"
                    description="Không tìm thấy bản ghi sự kiện hoặc cảnh báo nào theo tiêu chí lọc hiện tại."
                  />
                }
                renderItem={({ item: e }) => {
                  const info = KIND_NAMES[e.kind] ?? {
                    label: e.kind,
                    severity: "info" as const,
                    unit: "",
                  };

                  const isRelay = e.kind === "relay_cmd";
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
                            Thiết bị: {e.device_id ?? "esp32-01"} · {eventTime}
                          </Text>
                        </View>

                        <StatusBadge
                          status={
                            info.severity === "danger"
                              ? "danger"
                              : info.severity === "warning"
                              ? "warning"
                              : "primary"
                          }
                          label={
                            info.severity === "danger"
                              ? "Nguy cấp"
                              : info.severity === "warning"
                              ? "Cảnh báo"
                              : "Thông tin"
                          }
                        />
                      </View>

                      {/* MEASUREMENT OR COMMAND VALUES */}
                      <View style={[styles.cardBody, { backgroundColor: colors.surfaceSubtle }]}>
                        {isRelay ? (
                          <View style={styles.relayDetails}>
                            <View style={styles.detailRow}>
                              <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Thao tác lệnh:</Text>
                              <Text
                                style={[
                                  styles.detailVal,
                                  { color: e.value === 1.0 ? colors.success : colors.error, fontWeight: "600" },
                                ]}
                              >
                                {e.value === 1.0 ? "ĐÓNG RƠ-LE (BẬT)" : "NGẮT RƠ-LE (TẮT)"}
                              </Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Mã lệnh:</Text>
                              <Text style={[styles.detailVal, { color: colors.text }]}>
                                #{e.cmd_id || e.id}
                              </Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Xác nhận tiếp điểm:</Text>
                              <Text
                                style={[
                                  styles.detailVal,
                                  {
                                    color:
                                      e.verified === 1
                                        ? colors.success
                                        : e.verified === 0
                                        ? colors.error
                                        : colors.warning,
                                    fontWeight: "600",
                                  },
                                ]}
                              >
                                {e.verified === 1
                                  ? "Khớp tiếp điểm phụ (GPIO 27)"
                                  : e.verified === 0
                                  ? "Lỗi tiếp điểm phụ"
                                  : e.cmd_acked_at != null
                                  ? "ESP32 đã nhận lệnh"
                                  : "Đang chờ phản hồi"}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.metricDetails}>
                            <View style={styles.detailRow}>
                              <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Giá trị ghi nhận:</Text>
                              <Text style={[styles.detailVal, { color: colors.text, fontWeight: "700" }]}>
                                {e.value != null ? e.value.toFixed(1) : "--"} {info.unit}
                              </Text>
                            </View>
                            {e.threshold != null && (
                              <View style={styles.detailRow}>
                                <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Ngưỡng quy định:</Text>
                                <Text style={[styles.detailVal, { color: colors.textSecondary }]}>
                                  {e.threshold} {info.unit}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                      {e.note && (
                        <Text style={[styles.eventNote, { color: colors.textSecondary }]}>
                          Ghi chú: {e.note}
                        </Text>
                      )}
                    </View>
                  );
                }}
              />
            )}
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
    gap: 16,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  mainContainerMobile: {
    padding: 12,
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  controlsBar: {
    gap: 10,
  },
  searchInput: {
    height: 42,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  filterScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  segmentBtnText: {
    fontSize: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  eventCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  eventDevice: {
    fontSize: 11,
  },
  cardBody: {
    padding: 10,
    borderRadius: 6,
  },
  relayDetails: {
    gap: 4,
  },
  metricDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailKey: {
    fontSize: 12,
  },
  detailVal: {
    fontSize: 12,
  },
  eventNote: {
    fontSize: 11,
    fontStyle: "italic",
  },
  disabledCard: {
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  disabledBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  disabledTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  disabledDesc: {
    fontSize: 12,
    textAlign: "center",
    maxWidth: 380,
    lineHeight: 18,
  },
});
