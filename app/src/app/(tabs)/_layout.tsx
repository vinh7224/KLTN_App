import React from "react";
import { Tabs } from "expo-router";
import { useWindowDimensions, Platform } from "react-native";
import { useAppTheme } from "@/lib/theme-context";
import { TabIcon } from "@/components/ui/tab-icon";

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarPosition: wide ? "left" : "bottom",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderRightColor: colors.border,
          borderLeftColor: "transparent",
          borderBottomColor: "transparent",
          borderTopWidth: wide ? 0 : 1,
          borderRightWidth: wide ? 1 : 0,
          height: wide ? "100%" : 56,
          paddingBottom: wide ? 24 : 6,
          paddingTop: wide ? 24 : 6,
          width: wide ? 220 : "100%",
        },
        tabBarItemStyle: {
          paddingVertical: wide ? 10 : 2,
          paddingHorizontal: wide ? 14 : 2,
          marginVertical: wide ? 2 : 0,
          borderRadius: wide ? 6 : 0,
          justifyContent: "center",
          alignItems: wide ? "flex-start" : "center",
          minHeight: wide ? 42 : 44,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: wide ? 13 : 10,
          fontWeight: "500",
          letterSpacing: -0.1,
          marginTop: wide ? 0 : 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tổng quan",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="overview" color={color} size={wide ? 18 : 20} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Lịch sử",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="history" color={color} size={wide ? 18 : 20} />
          ),
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: "Dự báo",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="forecast" color={color} size={wide ? 18 : 20} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Cảnh báo",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="alerts" color={color} size={wide ? 18 : 20} />
          ),
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          title: "Điều khiển",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="control" color={color} size={wide ? 18 : 20} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Cài đặt",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings" color={color} size={wide ? 18 : 20} />
          ),
        }}
      />
    </Tabs>
  );
}
