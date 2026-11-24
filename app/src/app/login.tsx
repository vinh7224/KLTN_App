import React, { useState, useEffect } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { store } from "@/lib/storage";
import { api } from "@/lib/api";
import { useAppTheme, ThemeMode } from "@/lib/theme-context";

export default function Login() {
  const { signIn } = useAuth();
  const { colors, theme, setTheme } = useAppTheme();
  const [server, setServer] = useState("http://localhost:8000");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("12345");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    store.get("server").then((s) => {
      if (s) setServer(s);
    });
  }, []);

  const submit = async () => {
    try {
      setErr("");
      setLoading(true);
      const cleanServer = server.trim().replace(/\/+$/, "");
      await store.set("server", cleanServer || "http://localhost:8000");

      const r = await api<{ token: string; role?: string; username?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      await signIn(r.token, r.role, r.username);
    } catch (e: any) {
      setErr("Không thể đăng nhập: " + (e.message || "Lỗi máy chủ"));
    } finally {
      setLoading(false);
    }
  };

  const cycleTheme = () => {
    const next: ThemeMode = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
  };

  const themeLabel = theme === "system" ? "Tự động" : theme === "light" ? "Sáng" : "Tối";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TOP RIGHT THEME TOGGLE */}
        <View style={styles.topBar}>
          <Pressable
            style={[
              styles.themeToggleBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={cycleTheme}
          >
            <Text style={[styles.themeToggleText, { color: colors.textSecondary }]}>
              Giao diện: {themeLabel}
            </Text>
          </Pressable>
        </View>

        <View style={styles.authContainer}>
          {/* HEADER */}
          <View style={styles.brandHeader}>
            <Text style={{ fontSize: 40, marginBottom: 4 }}>⚡</Text>
            <Text style={[styles.title, { color: colors.text }]}>Giám sát Điện năng</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              IoT ESP32 + PZEM-004T & ML
            </Text>
          </View>

          {/* LOGIN CARD */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {!!err && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.error,
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.error }]}>{err}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                ĐỊA CHỈ MÁY CHỦ API
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={server}
                onChangeText={setServer}
                autoCapitalize="none"
                placeholder="http://localhost:8000"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.presetsRow}>
                <Text style={[styles.presetLabel, { color: colors.textSecondary }]}>Chọn nhanh:</Text>
                <Pressable
                  style={[styles.presetBtn, { borderColor: colors.border }]}
                  onPress={() => setServer("http://192.168.1.32:8000")}
                >
                  <Text style={[styles.presetBtnText, { color: colors.accent }]}>📱 IP PC: 192.168.1.32:8000</Text>
                </Pressable>
                <Pressable
                  style={[styles.presetBtn, { borderColor: colors.border }]}
                  onPress={() => setServer("http://localhost:8000")}
                >
                  <Text style={[styles.presetBtnText, { color: colors.accent }]}>💻 PC: localhost:8000</Text>
                </Pressable>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                💡 Trên Android/iOS: Bắt buộc dùng IP máy tính (:8000), không dùng localhost.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                TÀI KHOẢN
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="admin"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                MẬT KHẨU
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.accent },
                pressed && styles.submitBtnPressed,
                loading && styles.submitBtnDisabled,
              ]}
              disabled={loading}
              onPress={submit}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Đăng nhập</Text>
              )}
            </Pressable>
          </View>

          <Text style={[styles.footnote, { color: colors.textSecondary }]}>
            Khóa luận tốt nghiệp · Đề tài Giám sát & Dự báo Điện năng thông minh
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    minHeight: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    position: "relative",
  },
  topBar: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
  },
  themeToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  themeToggleText: {
    fontSize: 11,
    fontWeight: "500",
  },
  authContainer: {
    maxWidth: 380,
    width: "100%",
    gap: 14,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  brandHeader: {
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
  },
  card: {
    width: "100%",
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    gap: 14,
  },
  errorBox: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  input: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  presetsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  presetLabel: {
    fontSize: 10,
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  presetBtnText: {
    fontSize: 10,
    fontWeight: "500",
  },
  submitBtn: {
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  submitBtnPressed: {
    opacity: 0.9,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  footnote: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
});
