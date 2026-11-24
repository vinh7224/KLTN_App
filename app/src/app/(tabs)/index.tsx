import React from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLive } from "@/hooks/use-live";
import { useMonitor } from "@/lib/monitor";
import { useAppTheme } from "@/lib/theme-context";
import { MonitorSwitch } from "@/components/monitor-switch";
import { SystemHeader } from "@/components/ui/system-header";
import { StatCard } from "@/components/stat-card";
import { api } from "@/lib/api";

export default function Overview() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { colors } = useAppTheme();
  const { enabled } = useMonitor();
  const { data, connected } = useLive();

  // Đọc danh sách cảnh báo gần đây
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

  // Đánh giá ngưỡng kỹ thuật
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
      {/* HEADER DÙNG CHUNG CỦA HỆ THỐNG */}
      <SystemHeader
        title="Tổng quan điện năng"
        subtitle="Giám sát phụ tải thời gian thực từ ESP32 & PZEM-004T"
      />

      <ScrollView contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
        {/* MONITOR SWITCH */}
        <MonitorSwitch />

        {!enabled ? (
          /* TRẠNG THÁI GIÁM SÁT ĐANG TẮT */
          <View style={[styles.disabledCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.disabledDot, { backgroundColor: colors.textSecondary }]} />
            <Text style={[styles.disabledTitle, { color: colors.text }]}>
              Chế độ giám sát đang tắt
            </Text>
            <Text style={[styles.disabledDesc, { color: colors.textSecondary }]}>
              Hãy gạt công tắc phía trên để bắt đầu nhận dữ liệu trực tiếp.
            </Text>
          </View>
        ) : (
          <>
            {/* TRẠNG THÁI KẾT NỐI */}
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
                    ? "Dữ liệu trực tiếp từ ESP32"
                    : connected
                    ? "Chờ dữ liệu đo PZEM-004T..."
                    : "Đang kết nối lại máy chủ..."}
                </Text>
                {data?.latencyMs != null && (
                  <Text style={[styles.latencyText, { color: colors.textSecondary }]}>
                    Độ trễ: {data.latencyMs}ms
                  </Text>
                )}
              </View>
              {formattedTime && (
                <Text style={[styles.updateTime, { color: colors.textSecondary }]}>
                  Thời điểm mẫu: {formattedTime}
                </Text>
              )}
            </View>

            {/* LƯỚI 6 THÔNG SỐ ĐO PZEM-004T BẰNG STATCARD */}
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
                label="Công suất tác dụng"
                value={data?.p}
                unit="W"
                digits={1}
                nominal="Max 2000W"
                secondaryInfo={
                  data?.p == null
                    ? "Định mức an toàn 2000W"
                    : data.p > 2000
                    ? "Cảnh báo quá tải (> 2000W)"
                    : data.p > 1500
                    ? "Tiêu thụ cao (> 1500W)"
                    : "Công suất trong định mức"
                }
                status={powerStatus}
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

            {/* CẢNH BÁO GẦN ĐÂY */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Cảnh báo gần nhất
              </Text>
              {eventsQuery.isLoading ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 8 }} />
              ) : recentAlarms.length > 0 ? (
                <View style={styles.alarmList}>
                  {recentAlarms.map((ev) => (
                    <View key={ev.id} style={[styles.alarmItem, { borderBottomColor: colors.border }]}>
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
                          : ev.kind}
                      </Text>
                      <Text style={[styles.alarmTime, { color: colors.textSecondary }]}>
                        {new Date(ev.detected_at * 1000).toLocaleTimeString("vi-VN")}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                  Hệ thống an toàn, chưa ghi nhận cảnh báo bất thường.
                </Text>
              )}
            </View>
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
    gap: 14,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },
  contentMobile: {
    padding: 12,
    gap: 10,
  },
  disabledCard: {
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  disabledTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  disabledDesc: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 320,
  },
  statusBanner: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  latencyText: {
    fontSize: 11,
  },
  updateTime: {
    fontSize: 10,
    marginLeft: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  alarmList: {
    marginTop: 2,
  },
  alarmItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    gap: 8,
  },
  alarmKind: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  alarmTime: {
    fontSize: 11,
  },
  emptyHint: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
