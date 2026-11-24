import React from "react";
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
import { useLive } from "@/hooks/use-live";
import { useMonitor } from "@/lib/monitor";
import { useAppTheme } from "@/lib/theme-context";
import { MonitorSwitch } from "@/components/monitor-switch";
import { api } from "@/lib/api";

/* ── Cấu hình từng thẻ đại lượng điện ── */
interface StatDef {
  key: string;
  icon: string;
  label: string;
  unit: string;
  getValue: (d: any) => string;
  getHint: (d: any, status: string) => string;
  getStatus: (d: any) => "normal" | "warning" | "error";
}

const STATS: StatDef[] = [
  {
    key: "power",
    icon: "⚡",
    label: "CÔNG SUẤT",
    unit: "W",
    getValue: (d) => (d?.p != null ? d.p.toFixed(1) : "--"),
    getHint: (_d, s) => (s === "error" ? "⚠️ Quá tải > 2000W" : "Định mức an toàn"),
    getStatus: (d) => (!d?.p ? "normal" : d.p > 2000 ? "error" : d.p > 1500 ? "warning" : "normal"),
  },
  {
    key: "voltage",
    icon: "🔌",
    label: "ĐIỆN ÁP",
    unit: "V",
    getValue: (d) => (d?.v != null ? d.v.toFixed(1) : "--"),
    getHint: () => "Ngưỡng: 200 – 245V",
    getStatus: (d) => (!d?.v ? "normal" : d.v < 200 ? "warning" : d.v > 245 ? "error" : "normal"),
  },
  {
    key: "current",
    icon: "🔋",
    label: "DÒNG ĐIỆN",
    unit: "A",
    getValue: (d) => (d?.i != null ? d.i.toFixed(2) : "--"),
    getHint: (_d, s) => (s === "error" ? "⚠️ Quá dòng > 10A" : "Tối đa 10A"),
    getStatus: (d) => (!d?.i ? "normal" : d.i > 10 ? "error" : d.i > 7 ? "warning" : "normal"),
  },
  {
    key: "energy",
    icon: "📊",
    label: "ĐIỆN NĂNG",
    unit: "kWh",
    getValue: (d) => (d?.e != null ? d.e.toFixed(3) : "--"),
    getHint: () => "Tổng tích lũy từ công tơ",
    getStatus: () => "normal",
  },
  {
    key: "pf",
    icon: "📐",
    label: "HỆ SỐ CS",
    unit: "PF",
    getValue: (d) => (d?.pf != null ? d.pf.toFixed(2) : "--"),
    getHint: (d) => (d?.pf != null && d.pf >= 0.85 ? "Tốt (≥ 0.85)" : "Hao phí phản kháng"),
    getStatus: () => "normal",
  },
  {
    key: "freq",
    icon: "🌊",
    label: "TẦN SỐ",
    unit: "Hz",
    getValue: (d) => (d?.f != null ? d.f.toFixed(1) : "--"),
    getHint: () => "Chuẩn 50 Hz",
    getStatus: () => "normal",
  },
];

export default function Overview() {
  const { width } = useWindowDimensions();
  // Breakpoint: < 600 = mobile 2-col, 600-899 = tablet 3-col, >= 900 = desktop
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

  /* ── Hàm lấy màu theo trạng thái ngưỡng ── */
  const statusColor = (s: string) =>
    s === "error" ? colors.error : s === "warning" ? colors.warning : colors.text;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER — thu gọn trên mobile */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          ⚡ Tổng quan điện năng
        </Text>
        {!isMobile && (
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Giám sát phụ tải thời gian thực từ ESP32 & cảm biến PZEM-004T
          </Text>
        )}
      </View>

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
                    ? "Trực tiếp"
                    : connected
                    ? "Chờ PZEM…"
                    : "Đang kết nối…"}
                </Text>
                {data?.latencyMs != null && (
                  <Text style={[styles.latencyText, { color: colors.textSecondary }]}>
                    {data.latencyMs}ms
                  </Text>
                )}
              </View>
              {formattedTime && (
                <Text style={[styles.updateTime, { color: colors.textSecondary }]}>
                  Mẫu gần nhất: {formattedTime}
                </Text>
              )}
            </View>

            {/* GRID CÁC THẺ — 2 cột trên mobile, 3 cột trên tablet/desktop */}
            <View style={styles.grid}>
              {STATS.map((st) => {
                const status = st.getStatus(data);
                return (
                  <Pressable
                    key={st.key}
                    style={({ hovered }) => [
                      styles.statCard,
                      isMobile && styles.statCardMobile,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        ...(hovered && { opacity: 0.85, transform: [{ scale: 1.02 }] }),
                      },
                    ]}
                  >
                    {/* Icon + Label */}
                    <View style={styles.statHeader}>
                      <Text style={styles.statIcon}>{st.icon}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        {st.label}
                      </Text>
                    </View>
                    {/* Giá trị số liệu */}
                    <View style={styles.statValueRow}>
                      <Text
                        style={[
                          isMobile ? styles.statValueMobile : styles.statValue,
                          { color: statusColor(status) },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {st.getValue(data)}
                      </Text>
                      <Text style={[styles.statUnit, { color: colors.textSecondary }]}>
                        {st.unit}
                      </Text>
                    </View>
                    {/* Ghi chú */}
                    <Text style={[styles.statHint, { color: colors.textSecondary }]} numberOfLines={1}>
                      {st.getHint(data, status)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* CẢNH BÁO GẦN ĐÂY */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                🔔 Cảnh báo gần nhất
              </Text>
              {eventsQuery.isLoading ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 8 }} />
              ) : recentAlarms.length > 0 ? (
                <View style={styles.alarmList}>
                  {recentAlarms.map((ev) => (
                    <View key={ev.id} style={[styles.alarmItem, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.alarmKind, { color: colors.warning }]} numberOfLines={1}>
                        {ev.kind === "over_power"
                          ? "⚡ Quá công suất"
                          : ev.kind === "over_current"
                          ? "🔋 Quá dòng"
                          : ev.kind === "voltage"
                          ? "🔌 Điện áp bất thường"
                          : ev.kind === "night_load"
                          ? "🌙 Tải đêm bất thường"
                          : ev.kind === "over_forecast"
                          ? "🤖 Nghi quên tắt"
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
                  ✅ Hệ thống an toàn, chưa ghi nhận cảnh báo.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ════════════════════════════════════════════
   STYLES — Mobile-first, responsive grid
   ════════════════════════════════════════════ */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  /* ── Header ── */
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  /* ── Content Area ── */
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
  /* ── Disabled State ── */
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
  /* ── Status Banner ── */
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
  /* ── Grid — responsive 2-col mobile, 3-col desktop ── */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  /* ── Stat Card ── */
  statCard: {
    // Desktop/tablet: 3 cột (flex basis ~31%)
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  statCardMobile: {
    // Mobile: 2 cột — mỗi card chiếm ~48% chiều rộng
    flexBasis: "47%",
    minWidth: 0,
    padding: 12,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    fontSize: 13,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginVertical: 2,
  },
  statValue: {
    fontSize: 28, // DESIGN.md Display Metric
    fontWeight: "700",
  },
  statValueMobile: {
    fontSize: 22, // Thu nhỏ trên điện thoại để không tràn
    fontWeight: "700",
  },
  statUnit: {
    fontSize: 11,
    fontWeight: "500",
  },
  statHint: {
    fontSize: 10,
  },
  /* ── Alert Card ── */
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
