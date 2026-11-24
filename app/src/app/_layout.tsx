import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useAppTheme } from "@/lib/theme-context";
import { MonitorProvider } from "@/lib/monitor";
import { LiveProvider } from "@/context/LiveContext";

const qc = new QueryClient();

function Routes() {
  const { token, ready } = useAuth();
  const { isDark } = useAppTheme();

  if (!ready) return null;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!token}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!token}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AuthProvider>
          <MonitorProvider>
            <LiveProvider>
              <Routes />
            </LiveProvider>
          </MonitorProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
