import React from "react";
import { StyleSheet, Text, View, Platform, StyleProp, ViewStyle, useWindowDimensions } from "react-native";
import { useAppTheme } from "@/lib/theme-context";

export interface StatCardProps {
  label: string;
  value?: number | null;
  unit: string;
  digits?: number;
  nominal?: string;
  secondaryInfo?: string;
  status?: "normal" | "warning" | "danger" | "good";
  style?: StyleProp<ViewStyle>;
}

export function StatCard({
  label,
  value,
  unit,
  digits = 1,
  nominal,
  secondaryInfo,
  status = "normal",
  style,
}: StatCardProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { colors } = useAppTheme();

  const getStatusColor = () => {
    switch (status) {
      case "danger":
        return colors.error;
      case "warning":
        return colors.warning;
      case "good":
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const statusColor = getStatusColor();
  const displayVal = value == null ? "--" : value.toFixed(digits);

  return (
    <View
      style={[
        styles.card,
        isMobile && styles.cardMobile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        {nominal && (
          <View
            style={[
              styles.nominalBadge,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.nominalText, { color: colors.textSecondary }]}>{nominal}</Text>
          </View>
        )}
      </View>

      <View style={styles.valueRow}>
        <Text
          style={[
            isMobile ? styles.valueMobile : styles.value,
            { color: value == null ? colors.textSecondary : colors.text },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {displayVal}
        </Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>{unit}</Text>
      </View>

      {secondaryInfo && (
        <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.secondaryText, { color: statusColor }]} numberOfLines={1}>
            {secondaryInfo}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 140,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  cardMobile: {
    padding: 11,
    minWidth: 130,
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    flex: 1,
  },
  nominalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  nominalText: {
    fontSize: 10,
    fontWeight: "500",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginVertical: 2,
  },
  value: {
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: -0.5,
    fontFamily: Platform.select({
      web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
      default: "monospace",
    }),
  },
  valueMobile: {
    fontSize: 21,
    fontWeight: "600",
    letterSpacing: -0.5,
    fontFamily: Platform.select({
      web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
      default: "monospace",
    }),
  },
  unit: {
    fontSize: 12,
    fontWeight: "500",
  },
  footerRow: {
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryText: {
    fontSize: 11,
    fontWeight: "400",
  },
});
