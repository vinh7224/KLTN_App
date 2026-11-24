import React, { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useLive } from "@/hooks/use-live";
import { useMonitor } from "@/lib/monitor";
import { useAppTheme } from "@/lib/theme-context";
import { MonitorSwitch } from "@/components/monitor-switch";
import { SystemHeader } from "@/components/ui/system-header";
import { StatCard } from "@/components/stat-card";
import { FuturisticCard } from "@/components/ui/futuristic-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PowerChart, Pt } from "@/components/power-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api";

export default function Overview() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { colors } = useAppTheme();
  const { enabled } = useMonitor();
  const { data, connected, stale } = useLive();

  // Buffer of live points for realtime power chart
  const [livePoints, setLivePoints] = useState<Pt[]>([]);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (data && data.p != null && data.ts && data.ts !== lastTsRef.current) {
      lastTsRef.current = data.ts;
      setLivePoints((prev) => {
        const next = [...prev, { slot: data.ts!, value: data.p! }];
        // Keep max 20 latest live points
        return next.length > 20 ? next.slice(-20) : next;
      });
    }
  }, [data]);

  // Query 3 recent alarms
  const eventsQuery = useQuery({
    queryKey: ["recentEvents"],
    queryFn: () => api<any[]>("/events"),
    enabled: enabled,
    refetchInterval: enabled ? 10000 : false,
  });

  const recentAlarms = (eventsQuery.data ?? []).slice(0, 3);
  const isOnline = connected && data && !data.stale;

  const formattedTime = data?.ts
    ? new Date(data.ts * 1000).toLocaleTimeString("vi-VN")
    : null;

  // Threshold evaluations
  const voltageStatus = !data?.v
    ? "normal"
    : data.v < 200 || data.v > 245
    ? "warning"
    : "good";

  const currentStatus = !data?.i
    ? "normal"
    : data.i > 10
    ? "danger"
    : data.i > 7
    ? "warning"
    : "good";

  const powerStatus = !data?.p
    ? "normal"
    : data.p > 2000
    ? "danger"
    : data.p > 1500
    ? "warning"
    : "good";

  const pfStatus = !data?.pf
    ? "normal"
    : data.pf >= 0.85
    ? "good"
    : "warning";

  const freqStatus = !data?.f
    ? "normal"
    : data.f >= 49.5 && data.f <= 50.5
    ? "good"
    : "warning";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SystemHeader
        title="Tổng quan điện năng"
        subtitle="Giám sát phụ tải thời gian thực từ ESP32 & PZEM-004T"
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
      >
        {/* MONITOR SWITCH */}
        <MonitorSwitch />

        {!enabled ? (
          /* TRẠNG THÁI GIÁM SÁT ĐANG TẮT */
          <View style={[styles.disabledCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.disabledBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={[styles.disabledBadgeText, { color: colors.textSecondary }]}>
                Đang tắt giám sát
              </Text>
            </View>
            <Text style={[styles.disabledTitle, { color: colors.text }]}>
              Bật giám sát để nhận dữ liệu trực tiếp
            </Text>
            <Text style={[styles.disabledDesc, { color: colors.textSecondary }]}>
              Chế độ tiết kiệm mạng đang được kích hoạt. Gạt công tắc phía trên để mở luồng WebSocket `/ws/live`.
            </Text>
          </View>
        ) : (
          <>
            {/* TRẠNG THÁI HỆ THỐNG & KẾT NỐI */}
            <View style={[styles.statusBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isOnline
                        ? colors.success
                        : connected
                        ? colors.warning
                        : colors.error,
                    },
                  ]}
                />
                <Text style={[styles.statusText, { color: colors.text }]} numberOfLines={1}>
                  {isOnline
                    ? "Luồng trực tiếp từ ESP32 (Ổn định)"
                    : connected
                    ? stale
                      ? "Cảnh báo: Dữ liệu quá 5s chưa có bản tin mới (Stale)"
                      : "Đang chờ gói đo lường từ PZEM-004T..."
                    : "Mất kết nối máy chủ - Đang tự động kết nối lại..."}
                </Text>
              </View>

              <View style={styles.statusMeta}>
                {data?.latencyMs != null && (
                  <Text style={[styles.latencyText, { color: colors.textSecondary }]}>
                    Độ trễ: {data.latencyMs}ms
                  </Text>
                )}
                {formattedTime && (
                  <Text style={[styles.updateTime, { color: colors.textSecondary }]}>
                    Mẫu đo: {formattedTime}
                  </Text>
                )}
              </View>
            </View>

            {/* PRIMARY HIGHLIGHTED KPI: INSTANTANEOUS POWER */}
            <View
              style={[
                styles.primaryKpiCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: powerStatus === "danger" ? colors.error : colors.border,
                },
              ]}
            >
              <View style={styles.primaryKpiHeader}>
                <View>
                  <Text style={[styles.primaryKpiLabel, { color: colors.textSecondary }]}>
                    CÔNG SUẤT TỨC THỜI (ACTIVE POWER)
                  </Text>
                  <Text style={[styles.primaryKpiSubtitle, { color: colors.textSecondary }]}>
                    Đo thực tế qua biến dòng PZEM-004T
                  </Text>
                </View>
                <StatusBadge
                  status={
                    powerStatus === "danger"
                      ? "danger"
                      : powerStatus === "warning"
                      ? "warning"
                      : "success"
                  }
                  label={
                    data?.p == null
                      ? "Chờ dữ liệu"
                      : data.p > 2000
                      ? "Quá tải (> 2000W)"
                      : data.p > 1500
                      ? "Tải cao (> 1500W)"
                      : "Định mức an toàn"
                  }
                />
              </View>

              <View style={styles.primaryKpiValueRow}>
                <Text style={[styles.primaryKpiValue, { color: colors.text }]}>
                  {data?.p != null ? data.p.toFixed(1) : "--"}
                </Text>
                <Text style={[styles.primaryKpiUnit, { color: colors.textSecondary }]}>W</Text>
              </View>

              <View style={[styles.primaryKpiFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.primaryKpiLimit, { color: colors.textSecondary }]}>
                  Định mức an toàn tối đa: 2000 W · Dòng bảo vệ rơ-le: 10 A
                </Text>
              </View>
            </View>

            {/* 5 PZEM-004T METRICS GRID */}
            <View style={styles.grid}>
              <StatCard
                label="Điện áp RMS"
                value={data?.v}
                unit="V"
                digits={1}
                nominal="220V"
                secondaryInfo={
                  data?.v == null
                    ? "Ngưỡng: 200 - 245V"
                    : data.v < 200
                    ? "Thấp áp lưới (< 200V)"
                    : data.v > 245
                    ? "Quá áp lưới (> 245V)"
                    : "Điện áp danh định an toàn"
                }
                status={voltageStatus}
              />

              <StatCard
                label="Dòng điện tải"
                value={data?.i}
                unit="A"
                digits={2}
                nominal="Max 10A"
                secondaryInfo={
                  data?.i == null
                    ? "Định mức tối đa 10A"
                    : data.i > 10
                    ? "Cảnh báo quá dòng (> 10A)"
                    : data.i > 7
                    ? "Tải cao (> 7A)"
                    : "Dòng phụ tải ổn định"
                }
                status={currentStatus}
              />

              <StatCard
                label="Điện năng tích lũy"
                value={data?.e}
                unit="kWh"
                digits={3}
                secondaryInfo="Tổng tích lũy từ công tơ"
                status="normal"
              />

              <StatCard
                label="Hệ số công suất"
                value={data?.pf}
                unit="PF"
                digits={2}
                nominal=">= 0.85"
                secondaryInfo={
                  data?.pf == null
                    ? "Hiệu suất tiêu chuẩn >= 0.85"
                    : data.pf >= 0.85
                    ? "Hiệu suất tốt (>= 0.85)"
                    : "Hao phí công suất phản kháng"
                }
                status={pfStatus}
              />

              <StatCard
                label="Tần số lưới"
                value={data?.f}
                unit="Hz"
                digits={1}
                nominal="50Hz"
                secondaryInfo="Tần số điện lưới chuẩn 50Hz"
                status={freqStatus}
              />
            </View>

            {/* REALTIME POWER STREAM CHART */}
            {livePoints.length > 2 && (
              <FuturisticCard
                title="Luồng công suất phụ tải trực tiếp"
                subtitle="Biểu diễn chuỗi mẫu đo thời gian thực liên tục"
                badge={<StatusBadge status="online" label="Realtime" />}
              >
                <PowerChart
                  points={livePoints}
                  color={colors.accent}
                  height={180}
                  unit=" W"
                  showPeak
                />
              </FuturisticCard>
            )}

            {/* RECENT ALARMS CARD (NAVIGATES TO ALERTS TAB) */}
            <FuturisticCard
              title="Cảnh báo gần nhất"
              subtitle="3 sự kiện bất thường và lệnh đóng ngắt mới nhất"
              action={
                <Pressable
                  style={[styles.viewAllBtn, { borderColor: colors.border }]}
                  onPress={() => router.push("/(tabs)/alerts" as any)}
                >
                  <Text style={[styles.viewAllText, { color: colors.accent }]}>Xem tất cả</Text>
                </Pressable>
              }
            >
              {eventsQuery.isLoading ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 8 }} />
              ) : recentAlarms.length > 0 ? (
                <View style={styles.alarmList}>
                  {recentAlarms.map((ev) => (
                    <Pressable
                      key={ev.id}
                      style={[styles.alarmItem, { borderBottomColor: colors.border }]}
                      onPress={() => router.push("/(tabs)/alerts" as any)}
                    >
                      <View style={styles.alarmItemLeft}>
                        <Text style={[styles.alarmKind, { color: colors.warning }]} numberOfLines={1}>
                          {ev.kind === "over_power"
                            ? "Quá công suất"
                            : ev.kind === "over_current"
                            ? "Quá dòng"
                            : ev.kind === "voltage"
                            ? "Bất thường điện áp"
                            : ev.kind === "night_load"
                            ? "Tiêu thụ bất thường ban đêm"
                            : ev.kind === "over_forecast"
                            ? "Nghi quên tắt thiết bị"
                            : ev.kind === "relay_cmd"
                            ? "Lệnh rơ-le"
                            : ev.kind}
                        </Text>
                        <Text style={[styles.alarmTime, { color: colors.textSecondary }]}>
                          {new Date((ev.detected_at ?? ev.cmd_sent_at) * 1000).toLocaleTimeString("vi-VN")}
                        </Text>
                      </View>
                      <Text style={[styles.alarmVal, { color: colors.text }]}>
                        {ev.value != null ? `${ev.value.toFixed(1)}` : "--"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <EmptyState
                  title="Không có cảnh báo mới"
                  description="Hệ thống vận hành an toàn trong các ngưỡng tiêu chuẩn kỹ thuật."
                  height={80}
                />
              )}
            </FuturisticCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  contentMobile: {
    padding: 12,
    gap: 12,
  },
  statusBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 200,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  latencyText: {
    fontSize: 11,
  },
  updateTime: {
    fontSize: 11,
  },
  primaryKpiCard: {
    padding: 18,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  primaryKpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  primaryKpiLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  primaryKpiSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  primaryKpiValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  primaryKpiValue: {
    fontSize: 42,
    fontWeight: "700",
    letterSpacing: -1,
  },
  primaryKpiUnit: {
    fontSize: 18,
    fontWeight: "500",
  },
  primaryKpiFooter: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryKpiLimit: {
    fontSize: 11,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  alarmList: {
    gap: 4,
  },
  alarmItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  alarmItemLeft: {
    gap: 2,
  },
  alarmKind: {
    fontSize: 12,
    fontWeight: "600",
  },
  alarmTime: {
    fontSize: 11,
  },
  alarmVal: {
    fontSize: 13,
    fontWeight: "600",
  },
  viewAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: "600",
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
