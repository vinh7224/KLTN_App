import React, { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRefreshMs } from "@/hooks/use-refresh";
import { useMonitor } from "@/lib/monitor";
import { PowerChart, LegendItem } from "@/components/power-chart";
import { FuturisticCard } from "@/components/ui/futuristic-card";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SystemHeader } from "@/components/ui/system-header";
import { MonitorSwitch } from "@/components/monitor-switch";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppTheme } from "@/lib/theme-context";

export default function Forecast() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { colors } = useAppTheme();
  const { enabled } = useMonitor();
  const refresh = useRefreshMs();
  const [activeTab, setActiveTab] = useState<"chart" | "steps" | "benchmark">("chart");

  // Query actual historical 24 hours
  const hist = useQuery({
    queryKey: ["hist24"],
    queryFn: () => {
      const to = Math.floor(Date.now() / 1000);
      return api<any[]>(`/history?frm=${to - 86400}&to=${to}`);
    },
    enabled: enabled,
    refetchInterval: enabled ? refresh : false,
  });

  // Query XGBoost predicted 24 hours (96 steps)
  const fcXgb = useQuery({
    queryKey: ["forecast_xgboost"],
    queryFn: () => api<any[]>("/forecast?model=xgboost"),
    enabled: enabled,
    refetchInterval: enabled ? 60000 : false,
  });

  // Query Naive baseline 24 hours (96 steps)
  const fcNaive = useQuery({
    queryKey: ["forecast_naive"],
    queryFn: () => api<any[]>("/forecast?model=naive"),
    enabled: enabled,
    refetchInterval: enabled ? 60000 : false,
  });

  // Query evaluation metrics
  const mt = useQuery({
    queryKey: ["forecast_metrics"],
    queryFn: async () => {
      try {
        return await api<any[]>("/forecast/metrics");
      } catch {
        return [];
      }
    },
    enabled: enabled,
    refetchInterval: enabled ? 300000 : false,
  });

  const actualPoints = useMemo(
    () => (hist.data ?? []).map((d) => ({ slot: d.slot, value: d.p_avg ?? 0 })),
    [hist.data]
  );

  const xgbPoints = useMemo(
    () => (fcXgb.data ?? []).map((d) => ({ slot: d.slot, value: d.p_hat ?? 0 })),
    [fcXgb.data]
  );

  const naivePoints = useMemo(
    () => (fcNaive.data ?? []).map((d) => ({ slot: d.slot, value: d.p_hat ?? 0 })),
    [fcNaive.data]
  );

  // Derived predictions & insights
  const insights = useMemo(() => {
    if (!xgbPoints.length) {
      return {
        predictedTotalKWh: 0,
        predictedPeakW: 0,
        peakTimeStr: "--",
        predictedAvgW: 0,
        trend: "Chờ dữ liệu huấn luyện",
        modelName: "XGBoost Direct",
        isOverThreshold: false,
      };
    }

    let sumP = 0;
    let maxP = -Infinity;
    let peakSlot = xgbPoints[0].slot;

    for (const p of xgbPoints) {
      sumP += p.value;
      if (p.value > maxP) {
        maxP = p.value;
        peakSlot = p.slot;
      }
    }

    const avgP = sumP / xgbPoints.length;
    const totalKWh = (sumP * 0.25) / 1000;
    const peakDate = new Date(peakSlot * 1000);
    const peakTimeStr = `${peakDate.getHours().toString().padStart(2, "0")}:${peakDate
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const actAvg =
      actualPoints.length > 0
        ? actualPoints.reduce((acc, curr) => acc + curr.value, 0) / actualPoints.length
        : avgP;

    let trendLabel = "Tải ổn định (±5%)";
    if (avgP > actAvg * 1.05) trendLabel = "Xu hướng tăng phụ tải";
    else if (avgP < actAvg * 0.95) trendLabel = "Xu hướng giảm phụ tải";

    return {
      predictedTotalKWh: Math.round(totalKWh * 100) / 100,
      predictedPeakW: Math.round(maxP * 10) / 10,
      peakTimeStr,
      predictedAvgW: Math.round(avgP * 10) / 10,
      trend: trendLabel,
      modelName: "XGBoost Direct (H=96)",
      isOverThreshold: maxP > 2000,
    };
  }, [xgbPoints, actualPoints]);

  const chartLegends: LegendItem[] = useMemo(() => {
    const list: LegendItem[] = [
      { label: "24h Quá khứ", color: colors.accent, style: "solid" },
      { label: "24h XGBoost", color: colors.primary, style: "dashed" },
    ];
    if (naivePoints.length > 0) {
      list.push({ label: "24h Naive Baseline", color: colors.warning, style: "dotted" });
    }
    return list;
  }, [colors, naivePoints.length]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SystemHeader
        title="Dự báo phụ tải"
        subtitle="Mô hình hồi quy chuỗi thời gian 96 bước (24 giờ tiếp theo)"
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
              Mô hình dự báo phụ tải 24 giờ và phân tích bất thường đang tạm dừng theo dõi.
            </Text>
          </View>
        ) : (
          <>
            {/* MODEL INFO BANNER */}
            <View
              style={[
                styles.modelBanner,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.modelBannerLeft}>
                <Text style={[styles.modelTitle, { color: colors.text }]}>
                  Mô hình: {insights.modelName}
                </Text>
                <Text style={[styles.modelSubtitle, { color: colors.textSecondary }]}>
                  Chu kỳ 15 phút · Đường chân trời dự báo H=96 bước (24 giờ)
                </Text>
              </View>
              <StatusBadge
                status={xgbPoints.length ? "success" : "connecting"}
                label={xgbPoints.length ? "Đã sẵn sàng" : "Chờ dữ liệu"}
              />
            </View>

            {/* ACTIONABLE RECOMMENDATION / INSIGHT CARD */}
            {xgbPoints.length > 0 && (
              <View
                style={[
                  styles.insightBanner,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: insights.isOverThreshold ? colors.error : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.insightTitle,
                    { color: insights.isOverThreshold ? colors.error : colors.primary },
                  ]}
                >
                  {insights.isOverThreshold
                    ? "Cảnh báo đỉnh phụ tải dự kiến vượt ngưỡng an toàn"
                    : "Gợi ý vận hành và điều phối phụ tải"}
                </Text>
                <Text style={[styles.insightDesc, { color: colors.text }]}>
                  {insights.isOverThreshold
                    ? `Dự báo đỉnh công suất đạt ${insights.predictedPeakW} W vào khoảng ${insights.peakTimeStr}. Vượt ngưỡng an toàn 2000 W, khuyến nghị lên lịch bật phụ tải cao ngoài giờ cao điểm.`
                    : `Dự kiến đỉnh phụ tải đạt ${insights.predictedPeakW} W vào ${insights.peakTimeStr}. Tổng điện năng ước tính trong 24 giờ tới: ${insights.predictedTotalKWh} kWh. Hệ thống ở mức tải an toàn.`}
                </Text>
              </View>
            )}

            {/* 4 PREDICTED STAT CARDS */}
            <View style={styles.statsRow}>
              <StatCard
                label="Dự kiến điện năng 24h"
                value={insights.predictedTotalKWh}
                unit="kWh"
                digits={2}
                secondaryInfo="Tích phân 96 bước"
                status="good"
              />

              <StatCard
                label="Đỉnh phụ tải dự kiến"
                value={insights.predictedPeakW}
                unit="W"
                digits={1}
                secondaryInfo={`Lúc ${insights.peakTimeStr}`}
                status={insights.isOverThreshold ? "danger" : "normal"}
              />

              <StatCard
                label="Mức tải trung bình"
                value={insights.predictedAvgW}
                unit="W"
                digits={1}
                secondaryInfo={insights.trend}
                status="normal"
              />

              <StatCard
                label="Số bước dự báo"
                value={xgbPoints.length}
                unit="bước"
                digits={0}
                secondaryInfo="Khung 15 phút"
                status={xgbPoints.length >= 96 ? "good" : "warning"}
              />
            </View>

            {/* TAB SELECTOR */}
            <View
              style={[
                styles.segmentedGroup,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.segmentBtn,
                  activeTab === "chart" && {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setActiveTab("chart")}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: activeTab === "chart" ? colors.text : colors.textSecondary },
                    activeTab === "chart" && { fontWeight: "600" },
                  ]}
                >
                  Đồ thị so sánh 24 giờ
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.segmentBtn,
                  activeTab === "steps" && {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setActiveTab("steps")}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: activeTab === "steps" ? colors.text : colors.textSecondary },
                    activeTab === "steps" && { fontWeight: "600" },
                  ]}
                >
                  Bảng chi tiết 96 bước
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.segmentBtn,
                  activeTab === "benchmark" && {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setActiveTab("benchmark")}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: activeTab === "benchmark" ? colors.text : colors.textSecondary },
                    activeTab === "benchmark" && { fontWeight: "600" },
                  ]}
                >
                  Đánh giá sai số (Metrics)
                </Text>
              </Pressable>
            </View>

            {/* CHART TAB: MULTI-LINE OVERLAY */}
            {activeTab === "chart" && (
              <FuturisticCard
                title="Đồ thị phụ tải thực tế & dự báo liên tục 48 giờ"
                subtitle="Nối tiếp: [24h Quá khứ thực tế] -> [Điểm neo Hiện tại] -> [24h Dự báo tương lai]"
                badge={<StatusBadge status="success" label="Trục 48h liên tục" />}
              >
                {fcXgb.isError ? (
                  <ErrorState
                    title="Lỗi tải dữ liệu dự báo"
                    message="Không thể kết nối đến API /forecast của Backend."
                    onRetry={() => {
                      fcXgb.refetch();
                      hist.refetch();
                    }}
                  />
                ) : fcXgb.isLoading ? (
                  <LoadingState message="Đang tải dữ liệu dự báo 96 bước..." height={200} />
                ) : xgbPoints.length === 0 && actualPoints.length === 0 ? (
                  <EmptyState
                    title="Chưa có dữ liệu dự báo"
                    description="Hệ thống cần tối thiểu các mẫu đo lường quá khứ để chạy chu trình dự báo XGBoost."
                  />
                ) : (
                  <PowerChart
                    points={actualPoints.length > 0 ? actualPoints : xgbPoints}
                    color={colors.accent}
                    points2={xgbPoints.length > 0 ? xgbPoints : undefined}
                    color2={colors.primary}
                    strokeDashArray2={[6, 4]}
                    points3={naivePoints.length > 0 ? naivePoints : undefined}
                    color3={colors.warning}
                    strokeDashArray3={[2, 3]}
                    legend={chartLegends}
                    height={220}
                    unit=" W"
                    isContinuous48h={actualPoints.length > 0 && xgbPoints.length > 0}
                  />
                )}
              </FuturisticCard>
            )}

            {/* 96 STEPS TABLE TAB */}
            {activeTab === "steps" && (
              <FuturisticCard
                title="Chi tiết 96 bước dự báo phụ tải"
                subtitle="Bản ghi từng mốc thời gian slot 15 phút với giá trị p_hat"
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={[styles.tableWrapper, { borderColor: colors.border, minWidth: isMobile ? 520 : undefined }]}>
                    <View
                      style={[
                        styles.tableHeader,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.th, { flex: 1, color: colors.textSecondary }]}>BƯỚC</Text>
                      <Text style={[styles.th, { flex: 2, color: colors.textSecondary }]}>
                        THỜI ĐIỂM
                      </Text>
                      <Text
                        style={[
                          styles.th,
                          { flex: 2, textAlign: "right", color: colors.textSecondary },
                        ]}
                      >
                        XGBOOST (W)
                      </Text>
                      <Text
                        style={[
                          styles.th,
                          { flex: 1.5, textAlign: "center", color: colors.textSecondary },
                        ]}
                      >
                        MÔ HÌNH
                      </Text>
                    </View>

                    {xgbPoints.length === 0 ? (
                      <EmptyState
                        title="Không có bước dự báo"
                        description="Mô hình XGBoost chưa tạo ra chuỗi dự báo cho phiên làm việc này."
                      />
                    ) : (
                      (fcXgb.data ?? []).map((row, idx) => (
                        <View
                          key={row.step ?? idx}
                          style={[
                            styles.tableRow,
                            { borderBottomColor: colors.border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.td,
                              styles.tdMono,
                              { flex: 1, color: colors.textSecondary },
                            ]}
                          >
                            #{row.step ?? idx + 1}
                          </Text>
                          <Text style={[styles.td, { flex: 2, color: colors.text }]}>
                            {new Date(row.slot * 1000).toLocaleString("vi-VN")}
                          </Text>
                          <Text
                            style={[
                              styles.td,
                              styles.tdMono,
                              { flex: 2, textAlign: "right", color: colors.text, fontWeight: "600" },
                            ]}
                          >
                            {row.p_hat?.toFixed(1) ?? "--"} W
                          </Text>
                          <Text
                            style={[
                              styles.td,
                              { flex: 1.5, textAlign: "center", color: colors.textSecondary },
                            ]}
                          >
                            {row.model || "xgboost"}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              </FuturisticCard>
            )}

            {/* BENCHMARK / METRICS TAB */}
            {activeTab === "benchmark" && (
              <FuturisticCard
                title="Đánh giá sai số mô hình (Benchmark Metrics)"
                subtitle="Chỉ số MAE, RMSE, sMAPE của lần kiểm thử mới nhất từ Backend"
              >
                {mt.isLoading ? (
                  <LoadingState message="Đang tải chỉ số đánh giá sai số mô hình..." height={150} />
                ) : !mt.data || mt.data.length === 0 ? (
                  <EmptyState
                    title="Chưa có dữ liệu kiểm thử"
                    description="Cơ sở dữ liệu chưa ghi nhận bản ghi nào trong bảng forecast_metrics (cần dữ liệu huấn luyện và kiểm thử từ pipeline)."
                  />
                ) : (
                  <View style={styles.metricsGrid}>
                    {mt.data.map((m) => (
                      <View
                        key={m.model}
                        style={[
                          styles.scorecard,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.scorecardHead}>
                          <Text style={[styles.scorecardTitle, { color: colors.text }]}>
                            {m.model.toUpperCase()}
                          </Text>
                          <StatusBadge
                            status={m.model === "xgboost" ? "primary" : "neutral"}
                            label={m.model === "xgboost" ? "Mô hình chính" : "Tham chiếu"}
                          />
                        </View>
                        <View style={styles.scorecardRow}>
                          <View style={styles.scorecardItem}>
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                              MAE (Sai số tuyệt đối TB)
                            </Text>
                            <Text style={[styles.metricVal, { color: colors.text }]}>
                              {m.mae?.toFixed(2) ?? "--"} W
                            </Text>
                          </View>
                          <View style={styles.scorecardItem}>
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                              RMSE (Căn bậc hai sai số)
                            </Text>
                            <Text style={[styles.metricVal, { color: colors.text }]}>
                              {m.rmse?.toFixed(2) ?? "--"} W
                            </Text>
                          </View>
                          <View style={styles.scorecardItem}>
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                              sMAPE (Sai số %)
                            </Text>
                            <Text style={[styles.metricVal, { color: colors.text }]}>
                              {m.smape?.toFixed(2) ?? "--"}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </FuturisticCard>
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
  modelBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  modelBannerLeft: {
    gap: 2,
    flex: 1,
    minWidth: 200,
  },
  modelTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  modelSubtitle: {
    fontSize: 12,
  },
  insightBanner: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  insightDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  segmentedGroup: {
    flexDirection: "row",
    borderRadius: 6,
    borderWidth: 1,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentBtnText: {
    fontSize: 12,
  },
  tableWrapper: {
    width: "100%",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  td: {
    fontSize: 12,
  },
  tdMono: {
    fontFamily: Platform.select({ default: "monospace" }),
  },
  metricsGrid: {
    gap: 12,
  },
  scorecard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  scorecardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scorecardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  scorecardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  scorecardItem: {
    flex: 1,
    minWidth: 130,
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Platform.select({ default: "monospace" }),
  },
});
