import React, { useMemo } from "react";
import { View, Text, StyleSheet, useWindowDimensions, Platform } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { useAppTheme } from "@/lib/theme-context";

export type Pt = { slot: number; value: number; label?: string };

export interface LegendItem {
  label: string;
  color: string;
  style?: "solid" | "dashed" | "dotted";
}

interface PowerChartProps {
  points: Pt[];
  color?: string;
  points2?: Pt[];
  color2?: string;
  strokeDashArray2?: number[];
  points3?: Pt[];
  color3?: string;
  strokeDashArray3?: number[];
  maxValue?: number;
  height?: number;
  unit?: string;
  showPeak?: boolean;
  legend?: LegendItem[];
  // If true, stitches points (past 24h) and points2 (forecast 24h) along a continuous 48h timeline
  isContinuous48h?: boolean;
}

export function PowerChart({
  points,
  color,
  points2,
  color2,
  strokeDashArray2,
  points3,
  color3,
  strokeDashArray3,
  maxValue,
  height = 200,
  unit = " W",
  showPeak = false,
  legend,
  isContinuous48h = false,
}: PowerChartProps) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const chartColor = color || colors.accent;
  const line2Color = color2 || colors.primary;
  const line3Color = color3 || colors.warning;

  // Responsive width calculation
  const chartWidth = useMemo(() => {
    const containerMax = Math.min(width, 1100);
    return Math.max(260, containerMax - 88);
  }, [width]);

  // Compute peak, average, and clean formatted data
  const { peak, avg, chartData, chartData2, chartData3, endIndex1, startIndex2, endIndex2 } = useMemo(() => {
    if (!points || points.length === 0) {
      return {
        peak: 0,
        avg: 0,
        chartData: [],
        chartData2: undefined,
        chartData3: undefined,
        endIndex1: undefined,
        startIndex2: undefined,
        endIndex2: undefined,
      };
    }

    // ----------------------------------------------------
    // Continuous 48h mode: [Past 24h] -> [Anchor/Now] -> [Forecast 24h]
    // ----------------------------------------------------
    if (isContinuous48h && points2 && points2.length > 0) {
      let maxVal = -Infinity;
      let sum = 0;

      for (const p of points) {
        if (p.value > maxVal) maxVal = p.value;
        sum += p.value;
      }
      for (const p of points2) {
        if (p.value > maxVal) maxVal = p.value;
      }
      if (points3) {
        for (const p of points3) {
          if (p.value > maxVal) maxVal = p.value;
        }
      }

      const calculatedAvg = sum / points.length;

      // Downsample past and future consistently
      const stepPast = points.length > 96 ? Math.ceil(points.length / 48) : 1;
      const sampledPast = stepPast > 1 ? points.filter((_, idx) => idx % stepPast === 0) : points;

      const stepFut = points2.length > 96 ? Math.ceil(points2.length / 48) : 1;
      const sampledFut = stepFut > 1 ? points2.filter((_, idx) => idx % stepFut === 0) : points2;

      // Anchor point: duplicate the last past point as the first forecast point for seamless continuity
      const anchorPoint = sampledPast[sampledPast.length - 1];
      const continuousPoints = [...sampledPast, ...sampledFut];

      const pastLen = sampledPast.length;
      const totalLen = continuousPoints.length;

      // Label frequency (~6-8 labels along the 48h axis)
      const labelInterval = Math.max(1, Math.floor(totalLen / 6));

      // data1 (Solid: Past 24h up to anchor): values for past, dummy anchor repeat, then empty/0 or pad
      // In gifted-charts, data1 can hold past points with values, then for index >= pastLen, we can use endIndex1
      // Or provide data1 for pastLen, and data2 padded with past points as undefined/hide or starting at pastLen - 1.
      // Gifted-charts supports startIndex2 & endIndex2 or continuous data arrays.
      // To prevent NaN SVG path errors on Native:
      // data1: past points (index 0..pastLen-1) + future points padded with the same value or null
      // gifted-charts data2: points starting from pastLen - 1 (anchor point) to totalLen - 1
      const formatted1 = continuousPoints.map((p, i) => {
        const isLabelPoint = i % labelInterval === 0 || i === pastLen - 1 || i === totalLen - 1;
        const timeStr = new Date(p.slot * 1000).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const isPast = i < pastLen;
        return {
          value: isPast ? Math.round(p.value * 10) / 10 : Math.round(anchorPoint.value * 10) / 10,
          label: isLabelPoint ? timeStr : "",
          hideDataPoint: true,
        };
      });

      // data2: Future points starting from anchor point
      const formatted2 = continuousPoints.map((p, i) => {
        const isFutureOrAnchor = i >= pastLen - 1;
        return {
          value: isFutureOrAnchor ? Math.round(p.value * 10) / 10 : Math.round(p.value * 10) / 10,
          hideDataPoint: true,
        };
      });

      return {
        peak: Math.max(0, maxVal),
        avg: Math.round(calculatedAvg * 10) / 10,
        chartData: formatted1,
        chartData2: formatted2,
        chartData3: undefined,
        endIndex1: pastLen - 1,
        startIndex2: pastLen - 1,
        endIndex2: totalLen - 1,
      };
    }

    // ----------------------------------------------------
    // Standard Overlapping / Single Line Mode (e.g. History)
    // ----------------------------------------------------
    let maxVal = -Infinity;
    let sum = 0;
    for (const p of points) {
      if (p.value > maxVal) maxVal = p.value;
      sum += p.value;
    }

    if (points2) {
      for (const p of points2) {
        if (p.value > maxVal) maxVal = p.value;
      }
    }

    if (points3) {
      for (const p of points3) {
        if (p.value > maxVal) maxVal = p.value;
      }
    }

    const calculatedAvg = sum / points.length;

    // Downsample if dataset is large to maintain smooth rendering
    const step = points.length > 120 ? Math.ceil(points.length / 90) : 1;
    const sampled = step > 1 ? points.filter((_, idx) => idx % step === 0) : points;
    const labelInterval = Math.max(1, Math.floor(sampled.length / 6));

    const formatted = sampled.map((p, i) => {
      const isLabelPoint = i % labelInterval === 0 || i === sampled.length - 1;
      const timeStr = new Date(p.slot * 1000).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        value: Math.round(p.value * 10) / 10,
        label: isLabelPoint ? timeStr : "",
      };
    });

    // Format second line if present
    let formatted2: any[] | undefined = undefined;
    if (points2 && points2.length > 0) {
      const sampled2 = step > 1 ? points2.filter((_, idx) => idx % step === 0) : points2;
      formatted2 = sampled2.map((p) => ({
        value: Math.round(p.value * 10) / 10,
      }));
    }

    // Format third line if present
    let formatted3: any[] | undefined = undefined;
    if (points3 && points3.length > 0) {
      const sampled3 = step > 1 ? points3.filter((_, idx) => idx % step === 0) : points3;
      formatted3 = sampled3.map((p) => ({
        value: Math.round(p.value * 10) / 10,
      }));
    }

    return {
      peak: Math.max(0, maxVal),
      avg: Math.round(calculatedAvg * 10) / 10,
      chartData: formatted,
      chartData2: formatted2,
      chartData3: formatted3,
      endIndex1: undefined,
      startIndex2: undefined,
      endIndex2: undefined,
    };
  }, [points, points2, points3, isContinuous48h]);

  if (!points || points.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            height,
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Chưa có dữ liệu ghi nhận
        </Text>
      </View>
    );
  }

  const computedMax = maxValue ?? Math.ceil(Math.max(10, peak * 1.15) / 50) * 50;
  const spacing = chartData.length > 1 ? chartWidth / (chartData.length - 1) : chartWidth;

  return (
    <View style={styles.container}>
      {/* Legend & Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.statsGroup}>
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            Đỉnh: <Text style={{ color: colors.text, fontWeight: "600" }}>{peak.toFixed(1)}{unit}</Text>
          </Text>
          <Text style={[styles.statDivider, { color: colors.border }]}>·</Text>
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            Trung bình: <Text style={{ color: colors.text, fontWeight: "600" }}>{avg.toFixed(1)}{unit}</Text>
          </Text>
        </View>

        {legend && legend.length > 0 && (
          <View style={styles.legendContainer}>
            {legend.map((item, idx) => (
              <View key={idx} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendIndicator,
                    {
                      borderColor: item.color,
                      borderStyle: item.style === "dashed" ? "dashed" : item.style === "dotted" ? "dotted" : "solid",
                      borderBottomWidth: 2,
                    },
                  ]}
                />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Chart Canvas */}
      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          {...(chartData2 ? { data2: chartData2 } : {})}
          {...(chartData3 ? { data3: chartData3 } : {})}
          endIndex1={endIndex1}
          startIndex2={startIndex2}
          endIndex2={endIndex2}
          width={chartWidth}
          height={height}
          initialSpacing={4}
          spacing={spacing}
          thickness={1.8}
          color={chartColor}
          color1={chartColor}
          color2={line2Color}
          color3={line3Color}
          thickness1={1.8}
          thickness2={1.8}
          thickness3={1.6}
          strokeDashArray1={undefined}
          strokeDashArray2={strokeDashArray2 ?? [6, 4]}
          strokeDashArray3={strokeDashArray3 ?? [2, 3]}
          hideDataPoints
          hideDataPoints1
          hideDataPoints2
          hideDataPoints3
          areaChart={!chartData2 && !isContinuous48h}
          startFillColor={chartColor}
          endFillColor={chartColor}
          startOpacity={isDark ? 0.15 : 0.08}
          endOpacity={0.0}
          maxValue={computedMax}
          noOfSections={4}
          yAxisColor="transparent"
          xAxisColor={colors.border}
          yAxisLabelSuffix={unit}
          yAxisLabelWidth={50}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
          rulesType="solid"
          rulesColor={colors.border}
          pointerConfig={{
            pointerStripColor: colors.border,
            pointerStripWidth: 1,
            pointerColor: chartColor,
            radius: 3,
            pointerLabelWidth: 80,
            pointerLabelHeight: 38,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any) => {
              const item = items[0];
              return (
                <View
                  style={[
                    styles.tooltip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.tooltipTime, { color: colors.textSecondary }]}>
                    {item.label || "Thời điểm"}
                  </Text>
                  <Text style={[styles.tooltipVal, { color: colors.text }]}>
                    {item.value} {unit}
                  </Text>
                </View>
              );
            },
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
  },
  summaryBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 12,
  },
  statDivider: {
    fontSize: 12,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendIndicator: {
    width: 16,
    height: 0,
  },
  legendLabel: {
    fontSize: 11,
  },
  chartWrapper: {
    overflow: "hidden",
    paddingTop: 4,
  },
  tooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
  },
  tooltipTime: {
    fontSize: 9,
  },
  tooltipVal: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: Platform.select({ default: "monospace" }),
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
  },
});
