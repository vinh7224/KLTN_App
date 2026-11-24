import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { store } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import { useLive } from "@/hooks/use-live";
import { useRefreshMs } from "@/hooks/use-refresh";
import { FuturisticCard } from "@/components/ui/futuristic-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SystemHeader } from "@/components/ui/system-header";
import { useAppTheme, ThemeMode } from "@/lib/theme-context";
import { getServerHistory, saveServerToHistory, DEFAULT_SERVER } from "@/utils/serverHistory";

export default function Settings() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const qc = useQueryClient();
  const { signOut, role, username } = useAuth();
  const { colors, theme, setTheme, resolvedTheme } = useAppTheme();
  const { latencyMs, connected, stale } = useLive();
  const ms = useRefreshMs();
  const [server, setServer] = useState("");
  const [serverHistory, setServerHistory] = useState<string[]>([]);
  const [sec, setSec] = useState(String(ms / 1000));
  const [savedAlert, setSavedAlert] = useState(false);

  useEffect(() => {
    store.get("server").then((s) => setServer(s ?? DEFAULT_SERVER));
    getServerHistory().then(setServerHistory);
  }, []);

  useEffect(() => {
    setSec(String(ms / 1000));
  }, [ms]);

  const diag = useQuery({
    queryKey: ["diag"],
    queryFn: async () => {
      try {
        return await api<any>("/diagnostics");
      } catch {
        return null;
      }
    },
    refetchInterval: 10000,
  });

  const l = diag.data?.link ?? {};
  const loss = diag.data?.loss;
  const lost = loss && loss.expected ? loss.expected - loss.got : null;
  const lostPct =
    loss && loss.expected ? ((lost! / loss.expected) * 100).toFixed(2) : "--";

  const save = async () => {
    const cleanServer = server.trim().replace(/\/+$/, "");
    const finalServer = cleanServer || DEFAULT_SERVER;
    await store.set("server", finalServer);
    await store.set("refreshMs", String(Math.max(1, Number(sec) || 10) * 1000));
    const updatedHistory = await saveServerToHistory(finalServer);
    setServerHistory(updatedHistory);
    qc.invalidateQueries();
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
    { id: "light", label: "Chế độ Sáng" },
    { id: "dark", label: "Chế độ Tối" },
    { id: "system", label: "Theo hệ thống" },
  ];

  const roleName = role === "admin" ? "Quản trị viên (admin)" : "Người xem (viewer)";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SystemHeader
        title="⚙️ Cài đặt hệ thống"
        subtitle="Quản lý giao diện, kết nối máy chủ, chẩn đoán đường truyền và tài khoản"
      />

      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
        {savedAlert && (
          <View
            style={[
              styles.toast,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.success,
              },
            ]}
          >
            <Text style={[styles.toastText, { color: colors.success }]}>
              ✓ Cài đặt đã được lưu thành công
            </Text>
          </View>
        )}

        {/* ACCOUNT INFORMATION CARD */}
        <FuturisticCard
          title="Tài khoản người dùng"
          subtitle="Phiên làm việc và quyền hạn vận hành"
        >
          <View style={styles.accountRow}>
            <View style={styles.accountInfo}>
              <Text style={[styles.accountUser, { color: colors.text }]}>
                {username ? `Tài khoản: ${username}` : "Đang đăng nhập"}
              </Text>
              <Text style={[styles.accountRole, { color: colors.textSecondary }]}>
                Vai trò: {roleName}
              </Text>
            </View>
            <StatusBadge
              status={role === "admin" ? "primary" : "neutral"}
              label={role === "admin" ? "Toàn quyền điều khiển" : "Chỉ xem"}
            />
          </View>

          <Pressable
            style={[styles.logoutBtn, { borderColor: colors.error, backgroundColor: colors.surface }]}
            onPress={signOut}
          >
            <Text style={[styles.logoutBtnText, { color: colors.error }]}>Đăng xuất tài khoản</Text>
          </Pressable>
        </FuturisticCard>

        {/* THEME SELECTION CARD */}
        <FuturisticCard
          title="Giao diện hiển thị (Theme)"
          subtitle="Tùy chọn chế độ Sáng (Light Mode), Tối (Dark Mode) hoặc Theo hệ thống"
        >
          <View style={styles.themeOptionsRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[
                    styles.themeOptionBtn,
                    {
                      backgroundColor: active ? colors.surfaceSubtle : colors.surface,
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setTheme(opt.id)}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      {
                        color: active ? colors.accent : colors.text,
                        fontWeight: active ? "600" : "400",
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.themeHint, { color: colors.textSecondary }]}>
            Đang áp dụng: {resolvedTheme === "light" ? "Giao diện Sáng" : "Giao diện Tối"} (Lưu tự động vào bộ nhớ máy)
          </Text>
        </FuturisticCard>

        {/* SERVER CONNECTION SETTINGS */}
        <FuturisticCard
          title="Kết nối máy chủ (API & WebSocket)"
          subtitle="Địa chỉ IP Mosquitto / FastAPI backend và chu kỳ làm mới"
        >
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
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
              <Text style={[styles.presetTitle, { color: colors.textSecondary }]}>Gần đây:</Text>
              {serverHistory.map((s, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.presetBtn, { borderColor: server === s ? colors.accent : colors.border }]}
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
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              CHU KỲ LÀM MỚI ĐỒ THỊ (GIÂY)
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
              value={sec}
              onChangeText={setSec}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.accent }]}
            onPress={save}
          >
            <Text style={styles.saveBtnText}>Lưu cài đặt máy chủ</Text>
          </Pressable>
        </FuturisticCard>

        {/* NETWORK DIAGNOSTICS */}
        <FuturisticCard
          title="Chẩn đoán chất lượng đường truyền"
          subtitle="Thống kê gói tin, độ ổn định liên kết MQTT và độ trễ WebSocket"
          badge={
            <StatusBadge
              status={connected && !stale ? "online" : "warning"}
              label={connected && !stale ? "Kênh truyền ổn định" : "Cần kiểm tra"}
            />
          }
        >
          <View style={styles.diagGrid}>
            <View
              style={[
                styles.diagItem,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.diagLabel, { color: colors.textSecondary }]}>BẢN TIN ĐÃ NHẬN</Text>
              <Text style={[styles.diagVal, { color: colors.text }]}>{l.recv?.n ?? 0}</Text>
              <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>Gói telemetry qua MQTT</Text>
            </View>

            <View
              style={[
                styles.diagItem,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.diagLabel, { color: colors.textSecondary }]}>TỶ LỆ MẤT GÓI</Text>
              <Text style={[styles.diagVal, { color: lost && lost > 0 ? colors.error : colors.success }]}>
                {lost ?? 0} ({lostPct}%)
              </Text>
              <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>Tính theo boot & sequence</Text>
            </View>

            <View
              style={[
                styles.diagItem,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.diagLabel, { color: colors.textSecondary }]}>BẢN TIN TRÙNG LẶP</Text>
              <Text style={[styles.diagVal, { color: colors.text }]}>{l.dup?.n ?? 0}</Text>
              <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>Trùng mã boot & seq</Text>
            </View>

            <View
              style={[
                styles.diagItem,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.diagLabel, { color: colors.textSecondary }]}>SỐ LẦN NGẮT KẾT NỐI</Text>
              <Text style={[styles.diagVal, { color: colors.text }]}>{l.disconnect?.n ?? 0}</Text>
              <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>Báo qua MQTT Last Will</Text>
            </View>

            <View
              style={[
                styles.diagItem,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.diagLabel, { color: colors.textSecondary }]}>THỜI GIAN PHỤC HỒI TB</Text>
              <Text style={[styles.diagVal, { color: colors.text }]}>
                {l.reconnect_s?.avg_v != null ? `${l.reconnect_s.avg_v.toFixed(1)}s` : "--"}
              </Text>
              <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>Thời gian kết nối lại của ESP32</Text>
            </View>

            <View
              style={[
                styles.diagItem,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.diagLabel, { color: colors.textSecondary }]}>ĐỘ TRỄ HIỂN THỊ</Text>
              <Text style={[styles.diagVal, { color: colors.text }]}>
                {latencyMs != null ? `${latencyMs}ms` : "--"}
              </Text>
              <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>Độ trễ luồng WebSocket</Text>
            </View>
          </View>
        </FuturisticCard>

        {/* SYSTEM ARCHITECTURE SPECS */}
        <FuturisticCard
          title="Thông số kỹ thuật hệ thống"
          subtitle="Kiến trúc công nghệ IoT, Backend, Machine Learning & Frontend"
        >
          <View style={styles.specsList}>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Vi điều khiển:</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>ESP32-WROOM-32 (PlatformIO C++)</Text>
            </View>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Cảm biến điện năng:</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>PZEM-004T v3.0 (UART Modbus-RTU 9600)</Text>
            </View>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Cơ chế điều khiển:</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>Rơ-le chốt + Tiếp điểm phản hồi GPIO27</Text>
            </View>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Message Broker:</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>Eclipse Mosquitto (QoS 1, ACL)</Text>
            </View>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Backend & CSDL:</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>FastAPI + SQLite3 WAL Mode</Text>
            </View>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Mô hình dự báo:</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>XGBoost Direct + ARIMA + Seasonal Naive (96 bước)</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Frontend Framework:</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>Expo React Native (Cross-platform Web/Mobile)</Text>
            </View>
          </View>
        </FuturisticCard>
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
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  contentMobile: {
    padding: 12,
    gap: 12,
  },
  toast: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  toastText: {
    fontSize: 12,
    fontWeight: "500",
  },
  accountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  accountInfo: {
    gap: 2,
  },
  accountUser: {
    fontSize: 14,
    fontWeight: "600",
  },
  accountRole: {
    fontSize: 12,
  },
  themeOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themeOptionBtn: {
    flex: 1,
    minWidth: 120,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  themeOptionText: {
    fontSize: 13,
  },
  themeHint: {
    fontSize: 11,
    marginTop: 2,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
  input: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    minHeight: 40,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  presetsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  presetTitle: {
    fontSize: 11,
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  presetBtnText: {
    fontSize: 11,
  },
  saveBtn: {
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: 4,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  diagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  diagItem: {
    flex: 1,
    minWidth: 130,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  diagLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  diagVal: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Platform.select({ default: "monospace" }),
  },
  diagDesc: {
    fontSize: 10,
  },
  specsList: {
    gap: 0,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  specKey: {
    fontSize: 12,
  },
  specVal: {
    fontSize: 12,
    fontWeight: "500",
  },
  logoutBtn: {
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: 4,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
