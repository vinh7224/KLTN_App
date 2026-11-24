import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useColorScheme } from "react-native";
import { store } from "./storage";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  surfaceSubtle: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  // Aliases for legacy theme compatibility
  backgroundElement: string;
  backgroundSelected: string;
}

export const lightColors: ThemeColors = {
  primary: "#2563EB",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceSubtle: "#F1F5F9",
  text: "#0F172A",
  textSecondary: "#475569",
  border: "#E2E8F0",
  accent: "#2563EB",
  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
  backgroundElement: "#F1F5F9",
  backgroundSelected: "#E2E8F0",
};

export const darkColors: ThemeColors = {
  primary: "#38BDF8",
  background: "#0B1120",
  surface: "#151E32",
  surfaceSubtle: "#1E293B",
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  border: "#1E293B",
  accent: "#38BDF8",
  success: "#22C55E",
  warning: "#FBBF24",
  error: "#F87171",
  backgroundElement: "#1E293B",
  backgroundSelected: "#1E293B",
};

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "dark",
  isDark: true,
  colors: darkColors,
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    store.get("app_theme").then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeState(saved);
      }
      setReady(true);
    });
  }, []);

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    await store.set("app_theme", mode);
  };

  const resolvedTheme: "light" | "dark" = useMemo(() => {
    if (theme === "system") {
      return systemScheme === "light" ? "light" : "dark";
    }
    return theme;
  }, [theme, systemScheme]);

  const colors = resolvedTheme === "light" ? lightColors : darkColors;
  const isDark = resolvedTheme === "dark";

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isDark,
      colors,
      setTheme,
    }),
    [theme, resolvedTheme, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);
