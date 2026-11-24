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
import { getServerHistory, saveServerToHistory, DEFAULT_SERVER } from "@/utils/serverHistory";

export default function Login() {
  const { signIn } = useAuth();
  const { colors, theme, setTheme } = useAppTheme();
  const [server, setServer] = useState(DEFAULT_SERVER);
  const [serverHistory, setServerHistory] = useState<string[]>([]);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    store.get("server").then((s) => {
      if (s && s.trim()) setServer(s.trim());
      else setServer(DEFAULT_SERVER);
    });
    getServerHistory().then(setServerHistory);
  }, []);

  const isLocalhost =
    server.includes("localhost") || server.includes("127.0.0.1");

  const submit = async () => {
    if (!username.trim()) {
      setErr("Vui lòng nhập tên đăng nhập");
      return;
    }
    if (!password) {
      setErr("Vui lòng nhập mật khẩu");
      return;
    }

    try {
      setErr("");
      setLoading(true);
      const cleanServer = server.trim().replace(/\/+$/, "");
      await store.set("server", cleanServer || DEFAULT_SERVER);

      const r = await api<{ token: string; role?: string; username?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      // Save server to history after successful authentication
      await saveServerToHistory(cleanServer || DEFAULT_SERVER);

      await signIn(r.token, r.role, r.username);
    } catch (e: any) {
      setErr(e.message || "Không thể đăng nhập vào hệ thống.");
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
          {/* BRAND HEADER */}
          <View style={styles.brandHeader}>
            <View style={[styles.logoBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.logoBadgeText}>IoT</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Hệ Thống Giám Sát Điện Năng
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Khóa luận tốt nghiệp · ESP32, PZEM-004T & Machine Learning
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

            {/* SERVER URL FIELD */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                ĐỊA CHỈ MÁY CHỦ API
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      focusedField === "server" ? colors.accent : colors.border,
                    color: colors.text,
                  },
                ]}
                value={server}
                onChangeText={setServer}
                onFocus={() => setFocusedField("server")}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="http://192.168.1.10:8000"
                placeholderTextColor={colors.textSecondary}
              />

              {isLocalhost && (
                <Text style={[styles.hintText, { color: colors.warning }]}>
                  * Lưu ý: "localhost" chỉ hoạt động trên cùng một máy tính. Nếu thử nghiệm trên điện thoại Android/iOS, hãy đổi sang địa chỉ IP LAN của máy chủ (ví dụ: http://192.168.1.10:8000).
                </Text>
              )}

              {serverHistory.length > 0 && (
                <View style={styles.presetsRow}>
                  <Text style={[styles.presetLabel, { color: colors.textSecondary }]}>Gần đây:</Text>
                  {serverHistory.map((s, idx) => (
                    <Pressable
                      key={idx}
                      style={[
                        styles.presetBtn,
                        { borderColor: server === s ? colors.accent : colors.border },
                      ]}
                      onPress={() => setServer(s)}
                    >
                      <Text
                        style={[
                          styles.presetBtnText,
                          { color: server === s ? colors.accent : colors.textSecondary },
                        ]}
                      >
                        {s.replace(/^https?:\/\//, "")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* USERNAME FIELD */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                TÊN ĐĂNG NHẬP
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      focusedField === "username" ? colors.accent : colors.border,
                    color: colors.text,
                  },
                ]}
                value={username}
                onChangeText={setUsername}
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="admin hoặc viewer"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* PASSWORD FIELD */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                MẬT KHẨU
              </Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor:
                        focusedField === "password" ? colors.accent : colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  placeholder="Nhập mật khẩu..."
                  placeholderTextColor={colors.textSecondary}
                  onSubmitEditing={submit}
                  returnKeyType="done"
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={[styles.eyeBtnText, { color: colors.textSecondary }]}>
                    {showPassword ? "Ẩn" : "Hiện"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* SUBMIT BUTTON */}
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
                <Text style={styles.submitBtnText}>Đăng nhập vào hệ thống</Text>
              )}
            </Pressable>
          </View>

          <Text style={[styles.footnote, { color: colors.textSecondary }]}>
            Hệ thống phân quyền: admin (Toàn quyền điều khiển) · viewer (Chỉ xem dữ liệu)
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
    fontSize: 12,
  },
  authContainer: {
    width: "100%",
    maxWidth: 420,
    gap: 16,
  },
  brandHeader: {
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  logoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  logoBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    textAlign: "center",
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  errorBox: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  input: {
    height: 42,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    height: "100%",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  eyeBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  hintText: {
    fontSize: 11,
    lineHeight: 15,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  presetLabel: {
    fontSize: 11,
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  presetBtnText: {
    fontSize: 11,
  },
  submitBtn: {
    height: 44,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  submitBtnPressed: {
    opacity: 0.85,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  footnote: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
