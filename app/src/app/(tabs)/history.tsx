import React, { useState, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRefreshMs } from "@/hooks/use-refresh";
import { useMonitor } from "@/lib/monitor";
import { PowerChart } from "@/components/power-chart";
import { FuturisticCard } from "@/components/ui/futuristic-card";
import { StatCard } from "@/components/stat-card";
import { SystemHeader } from "@/components/ui/system-header";
import { MonitorSwitch } from "@/components/monitor-switch";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
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
  const refresh = useRefreshMs();

  // Query history: queryKey is stable ["history", selectedRange].
  // frm and to are calculated inside queryFn dynamically at execution time.
  const {
    data = [],
    error,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["history", selectedRange],
    queryFn: async () => {
      const toTs = Math.floor(Date.now() / 1000);
      let frmTs = 0;
      if (selectedRange === "today") {
        const now = new Date();
        frmTs = Math.floor(
          new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
        );
      } else if (selectedRange === "7d") {
        frmTs = toTs - 7 * 86400;
      } else {
        frmTs = toTs - 30 * 86400;
      }
      return api<any[]>(`/history?frm=${frmTs}&to=${toTs}`);
    },
    enabled: enabled,
    refetchInterval: enabled ? refresh : false,
    placeholderData: (previousData) => previousData,
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
    // 15-minute slot = 0.25 hours
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

  // Export CSV handler (Web Blob download, Mobile Alert)
  const exportCSV = () => {
    if (!data || data.length === 0) {
      if (Platform.OS !== "web") {
        Alert.alert("Thông báo", "Không có dữ liệu lịch sử để xuất file.");
      }
      return;
    }

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
    } else {
      Alert.alert(
        "Xuất CSV thành công",
        `Đã tạo nội dung ${data.length} bản ghi tiêu thụ điện năng cho bộ lọc ${selectedRange}.`
      );
    }
  };

  const chartPoints = useMemo(
    () => (data || []).map((d) => ({ slot: d.slot, value: d.p_avg ?? 0 })),
    [data]
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SystemHeader
        title="Lịch sử tiêu thụ"
        subtitle="Công suất trung bình 15 phút (agg_15min)"
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
      >
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
                          active && { fontWeight: "600" },
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
                  disabled={isRefetching}
                  onPress={() => refetch()}
                >
                  <Text style={[styles.actionBtnText, { color: colors.accent }]}>
                    {isRefetching ? "Đang tải..." : "Làm mới"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ERROR HANDLING */}
            {error ? (
              <ErrorState
                title="Lỗi tải lịch sử tiêu thụ"
                message={(error as any)?.message || "Không thể kết nối đến endpoint /history của Backend."}
                onRetry={() => refetch()}
              />
            ) : isLoading && !data.length ? (
              <LoadingState message="Đang tải lịch sử công suất phụ tải..." height={200} />
            ) : (
              <>
                {/* 4 STAT CARDS */}
                <View style={styles.statsGrid}>
                  <StatCard
                    label="Tổng tiêu thụ"
                    value={stats.totalEnergyKWh}
                    unit="kWh"
                    digits={3}
                    secondaryInfo="Tích phân công suất 15 phút"
                    status="normal"
                  />
                  <StatCard
                    label="Công suất trung bình"
                    value={stats.avgPower}
                    unit="W"
                    digits={1}
                    secondaryInfo="Trung bình trong chu kỳ"
                    status="normal"
                  />
                  <StatCard
                    label="Công suất đỉnh"
                    value={stats.maxPower}
                    unit="W"
                    digits={1}
                    secondaryInfo="Điểm phụ tải cực đại"
                    status={stats.maxPower > 2000 ? "danger" : "normal"}
                  />
                  <StatCard
                    label="Độ hoàn thiện mẫu"
                    value={stats.qualityPercent}
                    unit="%"
                    digits={0}
                    secondaryInfo={
                      stats.lowQualityPoints > 0
                        ? `${stats.lowQualityPoints} mẫu thiếu gói`
                        : "Dữ liệu liên tục đầy đủ"
                    }
                    status={stats.qualityPercent < 90 ? "warning" : "good"}
                  />
                </View>

                {/* POWER CHART CARD */}
                <FuturisticCard
                  title="Biểu đồ công suất phụ tải"
                  subtitle={`Chu kỳ 15 phút · Tổng số ${data.length} mẫu đo lường`}
                >
                  {chartPoints.length === 0 ? (
                    <EmptyState
                      title="Chưa có dữ liệu đồ thị"
                      description="Hệ thống chưa ghi nhận mẫu đo nào trong khoảng thời gian đã chọn."
                    />
                  ) : (
                    <PowerChart
                      points={chartPoints}
                      color={colors.accent}
                      height={220}
                      unit=" W"
                      showPeak
                    />
                  )}
                </FuturisticCard>

                {/* DATA TABLE (HORIZONTAL SCROLLABLE ON MOBILE) */}
                <FuturisticCard
                  title="Bảng dữ liệu đo lường chi tiết"
                  subtitle="Thời gian slot, công suất P_avg và hệ số hoàn thiện completeness"
                >
                  {data.length === 0 ? (
                    <EmptyState
                      title="Không có bản ghi"
                      description="Không có dữ liệu tổng hợp agg_15min trong khoảng thời gian này."
                    />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                      <View style={styles.table}>
                        <View
                          style={[
                            styles.tableRow,
                            styles.tableHeader,
                            { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.colHeader, styles.colTime, { color: colors.textSecondary }]}>
                            THỜI GIAN
                          </Text>
                          <Text style={[styles.colHeader, styles.colPower, { color: colors.textSecondary }]}>
                            CÔNG SUẤT TB (W)
                          </Text>
                          <Text style={[styles.colHeader, styles.colSamples, { color: colors.textSecondary }]}>
                            SỐ MẪU
                          </Text>
                          <Text style={[styles.colHeader, styles.colQuality, { color: colors.textSecondary }]}>
                            ĐỘ HOÀN THIỆN
                          </Text>
                        </View>

                        {data.slice(-50).map((row, idx) => {
                          const dateStr = new Date(row.slot * 1000).toLocaleString("vi-VN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          const comp = Math.round((row.completeness ?? 1) * 100);
                          const isLow = comp < 90;

                          return (
                            <View
                              key={row.slot || idx}
                              style={[
                                styles.tableRow,
                                {
                                  borderBottomColor: colors.border,
                                  backgroundColor: idx % 2 === 0 ? "transparent" : colors.surfaceSubtle,
                                },
                              ]}
                            >
                              <Text style={[styles.cell, styles.colTime, { color: colors.text }]}>
                                {dateStr}
                              </Text>
                              <Text style={[styles.cell, styles.colPower, { color: colors.text }]}>
                                {row.p_avg != null ? row.p_avg.toFixed(1) : "--"}
                              </Text>
                              <Text style={[styles.cell, styles.colSamples, { color: colors.textSecondary }]}>
                                {row.n_samples ?? "--"}
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  styles.colQuality,
                                  { color: isLow ? colors.warning : colors.success },
                                ]}
                              >
                                {comp}%
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )}
                </FuturisticCard>
              </>
            )}
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
  topControlRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  segmentedGroup: {
    flexDirection: "row",
    borderRadius: 6,
    borderWidth: 1,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentBtnText: {
    fontSize: 12,
  },
  actionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tableScroll: {
    width: "100%",
  },
  table: {
    minWidth: 540,
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeader: {
    borderRadius: 4,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cell: {
    fontSize: 12,
  },
  colTime: {
    flex: 2,
    minWidth: 150,
  },
  colPower: {
    flex: 1.5,
    minWidth: 110,
  },
  colSamples: {
    flex: 1,
    minWidth: 90,
  },
  colQuality: {
    flex: 1.2,
    minWidth: 100,
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
