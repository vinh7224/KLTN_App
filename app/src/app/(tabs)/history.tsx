import React, { useState, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRefreshMs } from "@/hooks/use-refresh";
import { useMonitor } from "@/lib/monitor";
import { PowerChart } from "@/components/power-chart";
import { FuturisticCard } from "@/components/ui/futuristic-card";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SystemHeader } from "@/components/ui/system-header";
import { MonitorSwitch } from "@/components/monitor-switch";
import { useAppTheme } from "@/lib/theme-context";

type RangeKey = "today" | "7d" | "30d";

interface RangeOption {
  key: RangeKey;
  label: string;
}

const RANGES: RangeOption[] = [
  { key: "today", label: "Hôm nay" },
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
];

export default function History() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { colors } = useAppTheme();
  const { enabled } = useMonitor();
  const [selectedRange, setSelectedRange] = useState<RangeKey>("today");
  const [showTable, setShowTable] = useState(true);
  const refresh = useRefreshMs();

  // Calculate frm and to timestamps based on selected range
  const { frm, to } = useMemo(() => {
    const toTs = Math.floor(Date.now() / 1000);
    if (selectedRange === "today") {
      const now = new Date();
      const startOfToday = Math.floor(
        new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
      );
      return { frm: startOfToday, to: toTs };
    } else if (selectedRange === "7d") {
      return { frm: toTs - 7 * 86400, to: toTs };
    } else {
      return { frm: toTs - 30 * 86400, to: toTs };
    }
  }, [selectedRange]);

  const {
    data = [],
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["history", selectedRange, frm, to],
    queryFn: () => api<any[]>(`/history?frm=${frm}&to=${to}`),
    enabled: enabled,
    refetchInterval: enabled ? refresh : false,
  });

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalEnergyKWh: 0,
        avgPower: 0,
        maxPower: 0,
        minPower: 0,
        lowQualityPoints: 0,
        qualityPercent: 100,
      };
    }

    let sumP = 0;
    let maxP = -Infinity;
    let minP = Infinity;
    let lowCount = 0;

    for (const d of data) {
      const p = d.p_avg ?? 0;
      sumP += p;
      if (p > maxP) maxP = p;
      if (p < minP) minP = p;
      if ((d.completeness ?? 1) < 0.9) lowCount++;
    }

    const avgP = sumP / data.length;
    const totalKWh = (sumP * 0.25) / 1000;
    const qualityPct = Math.round(((data.length - lowCount) / data.length) * 100);

    return {
      totalEnergyKWh: Math.round(totalKWh * 1000) / 1000,
      avgPower: Math.round(avgP * 10) / 10,
      maxPower: maxP === -Infinity ? 0 : Math.round(maxP * 10) / 10,
      minPower: minP === Infinity ? 0 : Math.round(minP * 10) / 10,
      lowQualityPoints: lowCount,
      qualityPercent: qualityPct,
    };
  }, [data]);

  // Export CSV handler
  const exportCSV = () => {
    if (!data.length) return;
    const headers = "ThoiGian,TimestampSlot,CongSuatTrungBinh_W,DoHoanThien_Pct\n";
    const rows = data
      .map((d) => {
        const timeStr = new Date(d.slot * 1000).toLocaleString("vi-VN");
        const comp = Math.round((d.completeness ?? 1) * 100);
        return `"${timeStr}",${d.slot},${d.p_avg ?? 0},${comp}`;
      })
      .join("\n");
    const csvContent = headers + rows;

    if (Platform.OS === "web") {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `LichSuDienNang_${selectedRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const chartPoints = useMemo(
    () => (data || []).map((d) => ({ slot: d.slot, value: d.p_avg ?? 0 })),
    [data]
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SystemHeader
        title="📈 Lịch sử tiêu thụ"
        subtitle="Công suất trung bình 15 phút (agg_15min)"
      />

      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
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
              Tính năng truy vấn dữ liệu phụ tải và lịch sử đo lường đang tạm dừng để tiết kiệm tài nguyên mạng.
            </Text>
          </View>
        ) : (
          <>
            {/* RANGE SELECTOR & ACTIONS */}
            <View style={styles.topControlRow}>
              <View
                style={[
                  styles.segmentedGroup,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {RANGES.map((r) => {
                  const active = r.key === selectedRange;
                  return (
                    <Pressable
                      key={r.key}
                      onPress={() => setSelectedRange(r.key)}
                      style={[
                        styles.segmentBtn,
                        active && {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          { color: active ? colors.text : colors.textSecondary },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.actionsGroup}>
                <Pressable
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={exportCSV}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Xuất CSV</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => refetch()}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Làm mới</Text>
                </Pressable>
              </View>
            </View>

            {error && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.error,
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Không thể tải dữ liệu lịch sử từ máy chủ
                </Text>
              </View>
            )}

            {/* 4 SUMMARY STAT CARDS */}
            <View style={styles.statsRow}>
              <StatCard
                label="Tổng tiêu thụ"
                value={stats.totalEnergyKWh}
                unit="kWh"
                digits={3}
                secondaryInfo={`${data.length} khung 15 phút`}
                status="good"
              />

              <StatCard
                label="Công suất trung bình"
                value={stats.avgPower}
                unit="W"
                digits={1}
                secondaryInfo="Mức tải ổn định"
                status="normal"
              />

              <StatCard
                label="Công suất đỉnh"
                value={stats.maxPower}
                unit="W"
                digits={1}
                secondaryInfo={`Thấp nhất: ${stats.minPower != null && isFinite(stats.minPower) ? stats.minPower.toFixed(1) : "0.0"} W`}
                status={stats.maxPower > 2000 ? "danger" : "normal"}
              />

              <StatCard
                label="Độ hoàn thiện"
                value={stats.qualityPercent}
                unit="%"
                digits={0}
                secondaryInfo={
                  stats.lowQualityPoints > 0
                    ? `${stats.lowQualityPoints} khung thiếu mẫu`
                    : "Đầy đủ 100% mẫu đo"
                }
                status={stats.lowQualityPoints > 0 ? "warning" : "good"}
              />
            </View>

            {/* POWER LOAD PROFILE CHART */}
            <FuturisticCard
              title={`Đồ thị phụ tải (${RANGES.find((r) => r.key === selectedRange)?.label})`}
              subtitle="Công suất trung bình tính toán theo khung 15 phút (agg_15min)"
              badge={
                <StatusBadge
                  status={stats.lowQualityPoints > 0 ? "warning" : "online"}
                  label={`${data.length} khung`}
                />
              }
            >
              {isLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={colors.accent} size="small" />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Đang tải dữ liệu lịch sử...
                  </Text>
                </View>
              ) : (
                <PowerChart points={chartPoints} height={200} unit=" W" />
              )}
            </FuturisticCard>

            {/* COMPLETENESS & DETAILED DATA TABLE */}
            <FuturisticCard
              title="Bảng số liệu độ hoàn thiện (Completeness)"
              subtitle="Số mẫu nhận được trên tổng số 900 mẫu lý thuyết mỗi khung 15 phút"
              action={
                <Pressable onPress={() => setShowTable(!showTable)}>
                  <Text style={[styles.toggleTableText, { color: colors.accent }]}>
                    {showTable ? "Thu gọn" : "Mở rộng"}
                  </Text>
                </Pressable>
              }
            >
              {showTable && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.tableWrapper, { borderColor: colors.border, minWidth: isMobile ? 500 : undefined }]}>
                    <View
                      style={[
                        styles.tableHeader,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.th, { flex: 2, color: colors.textSecondary }]}>
                        KHUNG THỜI GIAN
                      </Text>
                      <Text
                        style={[
                          styles.th,
                          { flex: 1.5, textAlign: "right", color: colors.textSecondary },
                        ]}
                      >
                        CÔNG SUẤT (W)
                      </Text>
                      <Text
                        style={[
                          styles.th,
                          { flex: 1.5, textAlign: "right", color: colors.textSecondary },
                        ]}
                      >
                        HOÀN THIỆN
                      </Text>
                      <Text
                        style={[
                          styles.th,
                          { flex: 1.5, textAlign: "center", color: colors.textSecondary },
                        ]}
                      >
                        TRẠNG THÁI
                      </Text>
                    </View>

                    {data.length === 0 ? (
                      <View style={styles.emptyTable}>
                        <Text style={[styles.emptyTableText, { color: colors.textSecondary }]}>
                          Không có bản ghi nào trong khoảng thời gian này
                        </Text>
                      </View>
                    ) : (
                      data
                        .slice(-40)
                        .reverse()
                        .map((item, idx) => {
                          const completenessPct = Math.round((item.completeness ?? 1) * 100);
                          const isLow = completenessPct < 90;
                          return (
                            <View
                              key={item.slot || idx}
                              style={[
                                styles.tableRow,
                                { borderBottomColor: colors.border },
                              ]}
                            >
                              <Text style={[styles.td, { flex: 2, color: colors.text }]}>
                                {new Date(item.slot * 1000).toLocaleString("vi-VN")}
                              </Text>
                              <Text
                                style={[
                                  styles.td,
                                  styles.tdMono,
                                  { flex: 1.5, textAlign: "right", color: colors.text },
                                ]}
                              >
                                {item.p_avg?.toFixed(1) ?? "--"}
                              </Text>
                              <Text
                                style={[
                                  styles.td,
                                  styles.tdMono,
                                  {
                                    flex: 1.5,
                                    textAlign: "right",
                                    color: isLow ? colors.warning : colors.success,
                                  },
                                ]}
                              >
                                {completenessPct}%
                              </Text>
                              <View style={{ flex: 1.5, alignItems: "center" }}>
                                <StatusBadge
                                  status={isLow ? "warning" : "success"}
                                  label={isLow ? "Thiếu mẫu" : "Đạt chuẩn"}
                                />
                              </View>
                            </View>
                          );
                        })
                    )}
                  </View>
                </ScrollView>
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
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  contentMobile: {
    padding: 12,
    gap: 12,
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
  topControlRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  segmentedGroup: {
    flexDirection: "row",
    borderRadius: 6,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  segmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: 36,
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  errorBanner: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  loadingBox: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  toggleTableText: {
    fontSize: 12,
    fontWeight: "500",
  },
  tableWrapper: {
    borderWidth: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  th: {
    fontSize: 11,
    fontWeight: "600",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  td: {
    fontSize: 12,
  },
  tdMono: {
    fontFamily: Platform.select({ default: "monospace" }),
  },
  emptyTable: {
    padding: 20,
    alignItems: "center",
  },
  emptyTableText: {
    fontSize: 12,
  },
});
