import React from "react";
import { Tabs } from "expo-router";
import { useWindowDimensions, Text, Platform } from "react-native";
import { useAppTheme } from "@/lib/theme-context";

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
          height: wide ? "100%" : 54,
          paddingBottom: wide ? 20 : 4,
          paddingTop: wide ? 20 : 4,
          width: wide ? 200 : "100%",
        },
        tabBarItemStyle: {
          paddingVertical: wide ? 8 : 2,
          paddingHorizontal: wide ? 12 : 2,
          marginVertical: wide ? 2 : 0,
          borderRadius: wide ? 6 : 0,
          justifyContent: "center",
          alignItems: wide ? "flex-start" : "center",
          minHeight: wide ? 40 : 44,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: wide ? 13 : 10,
          fontWeight: "500",
          letterSpacing: -0.1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tổng quan",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: wide ? 16 : 18 }}>⚡</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Lịch sử",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: wide ? 16 : 18 }}>📈</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: "Dự báo",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: wide ? 16 : 18 }}>🤖</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Cảnh báo",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: wide ? 16 : 18 }}>🔔</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          title: "Điều khiển",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: wide ? 16 : 18 }}>🎛️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Cài đặt",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: wide ? 16 : 18 }}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}
