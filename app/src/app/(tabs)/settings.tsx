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
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppTheme, ThemeMode } from "@/lib/theme-context";
import { getServerHistory, saveServerToHistory, DEFAULT_SERVER } from "@/utils/serverHistory";

interface LinkStats {
  recv: number;
  dup: number;
  disconnect: number;
  reconnect_avg_s: number;
}

interface BootPacketLoss {
  boot: number;
  min_seq: number;
  max_seq: number;
  received: number;
  expected: number;
  loss_rate: number;
}

interface DiagnosticsResponse {
  link_stats: LinkStats;
  boot_packet_loss: BootPacketLoss[];
}

export default function Settings() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const qc = useQueryClient();
  const { signOut, role, username } = useAuth();
  const { colors, theme, setTheme, resolvedTheme } = useAppTheme();
  const { latencyMs, connected, stale, reconnect } = useLive();
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
    queryFn: () => api<DiagnosticsResponse>("/diagnostics"),
    refetchInterval: 10000,
  });

  const linkStats = diag.data?.link_stats;
  const bootList = diag.data?.boot_packet_loss ?? [];
  const latestBoot = bootList.length > 0 ? bootList[0] : null;

  const save = async () => {
    const cleanServer = server.trim().replace(/\/+$/, "");
    const finalServer = cleanServer || DEFAULT_SERVER;
    await store.set("server", finalServer);
    await store.set("refreshMs", String(Math.max(1, Number(sec) || 10) * 1000));
    const updatedHistory = await saveServerToHistory(finalServer);
    setServerHistory(updatedHistory);
    qc.invalidateQueries();
    reconnect();
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
        title="Cài đặt hệ thống"
        subtitle="Quản lý giao diện, kết nối máy chủ, chẩn đoán đường truyền và tài khoản"
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
      >
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
              ✓ Cài đặt đã được lưu và cập nhật kết nối thành công
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
          title="Giao diện hiển thị"
          subtitle="Tùy chọn chế độ Sáng (Light), Tối (Dark) hoặc Theo hệ thống"
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
            Đang áp dụng: {resolvedTheme === "light" ? "Giao diện Sáng (Light)" : "Giao diện Tối (Dark)"} (Tự động lưu vào thiết bị)
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
              placeholder="http://192.168.1.10:8000"
              placeholderTextColor={colors.textSecondary}
            />

            {serverHistory.length > 0 && (
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
            )}
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
          title="Chẩn đoán chất lượng đường truyền (Diagnostics)"
          subtitle="Thống kê telemetry qua MQTT và phân tích mất gói tin theo boot"
          badge={
            <StatusBadge
              status={connected && !stale ? "online" : diag.isError ? "danger" : "warning"}
              label={connected && !stale ? "Kênh truyền ổn định" : diag.isError ? "Lỗi máy chủ" : "Cần kiểm tra"}
            />
          }
        >
          {diag.isError ? (
            <ErrorState
              title="Lỗi tải chẩn đoán đường truyền"
              message="Không thể kết nối đến API /diagnostics. Kiểm tra backend FastAPI."
              onRetry={() => diag.refetch()}
            />
          ) : diag.isLoading && !diag.data ? (
            <LoadingState message="Đang truy vấn thống kê link_stats..." height={150} />
          ) : (
            <>
              <View style={styles.diagGrid}>
                {/* 1. Tổng bản tin nhận */}
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
                  <Text style={[styles.diagVal, { color: colors.text }]}>
                    {linkStats?.recv != null ? linkStats.recv : "--"}
                  </Text>
                  <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>Gói telemetry qua MQTT</Text>
                </View>

                {/* 2. Tỷ lệ mất gói phiên boot gần nhất */}
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
                  <Text
                    style={[
                      styles.diagVal,
                      {
                        color:
                          latestBoot && latestBoot.loss_rate > 0
                            ? colors.error
                            : colors.success,
                      },
                    ]}
                  >
                    {latestBoot != null
                      ? `${(latestBoot.loss_rate * 100).toFixed(2)}%`
                      : "--"}
                  </Text>
                  <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>
                    {latestBoot != null
                      ? `Mất ${latestBoot.expected - latestBoot.received} / ${latestBoot.expected} gói`
                      : "Chưa có chu kỳ boot"}
                  </Text>
                </View>

                {/* 3. Bản tin trùng lặp */}
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
                  <Text style={[styles.diagVal, { color: colors.text }]}>
                    {linkStats?.dup != null ? linkStats.dup : "--"}
                  </Text>
                  <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>Trùng mã boot & seq</Text>
                </View>

                {/* 4. Số lần ngắt kết nối */}
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
                  <Text
                    style={[
                      styles.diagVal,
                      {
                        color:
                          linkStats?.disconnect && linkStats.disconnect > 0
                            ? colors.warning
                            : colors.text,
                      },
                    ]}
                  >
                    {linkStats?.disconnect != null ? linkStats.disconnect : "--"}
                  </Text>
                  <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>Báo qua MQTT Last Will</Text>
                </View>

                {/* 5. Thời gian phục hồi trung bình */}
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
                    {linkStats?.reconnect_avg_s != null
                      ? `${linkStats.reconnect_avg_s.toFixed(1)}s`
                      : "--"}
                  </Text>
                  <Text style={[styles.diagDesc, { color: colors.textSecondary }]}>Thời gian kết nối lại của ESP32</Text>
                </View>

                {/* 6. Độ trễ hiển thị */}
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

              {/* BẢNG CHI TIẾT CÁC PHIÊN BOOT */}
              {bootList.length > 0 && (
                <View style={styles.bootTableContainer}>
                  <Text style={[styles.bootTableTitle, { color: colors.textSecondary }]}>
                    LỊCH SỬ CÁC PHIÊN BOOT ESP32 ({bootList.length} phiên gần nhất)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View style={styles.bootTable}>
                      <View style={[styles.bootTableRow, { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border }]}>
                        <Text style={[styles.bootHeaderCell, { color: colors.textSecondary, width: 80 }]}>BOOT #</Text>
                        <Text style={[styles.bootHeaderCell, { color: colors.textSecondary, width: 90 }]}>MIN SEQ</Text>
                        <Text style={[styles.bootHeaderCell, { color: colors.textSecondary, width: 90 }]}>MAX SEQ</Text>
                        <Text style={[styles.bootHeaderCell, { color: colors.textSecondary, width: 90 }]}>DỰ KIẾN</Text>
                        <Text style={[styles.bootHeaderCell, { color: colors.textSecondary, width: 90 }]}>ĐÃ NHẬN</Text>
                        <Text style={[styles.bootHeaderCell, { color: colors.textSecondary, width: 100 }]}>TỶ LỆ MẤT</Text>
                      </View>
                      {bootList.map((b) => (
                        <View key={b.boot} style={[styles.bootTableRow, { borderBottomColor: colors.border }]}>
                          <Text style={[styles.bootCell, { color: colors.text, width: 80, fontWeight: "600" }]}>#{b.boot}</Text>
                          <Text style={[styles.bootCell, { color: colors.textSecondary, width: 90 }]}>{b.min_seq}</Text>
                          <Text style={[styles.bootCell, { color: colors.textSecondary, width: 90 }]}>{b.max_seq}</Text>
                          <Text style={[styles.bootCell, { color: colors.textSecondary, width: 90 }]}>{b.expected}</Text>
                          <Text style={[styles.bootCell, { color: colors.text, width: 90 }]}>{b.received}</Text>
                          <Text
                            style={[
                              styles.bootCell,
                              {
                                color: b.loss_rate > 0 ? colors.error : colors.success,
                                width: 100,
                                fontWeight: "600",
                              },
                            ]}
                          >
                            {(b.loss_rate * 100).toFixed(2)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </FuturisticCard>

        {/* SYSTEM ARCHITECTURE SPECS */}
        <FuturisticCard
          title="Thông số kỹ thuật hệ thống"
          subtitle="Kiến trúc công nghệ IoT, Backend, Machine Learning & Frontend"
        >
          <View style={styles.specsList}>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>VI ĐIỀU KHIỂN & CẢM BIẾN</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>ESP32-WROOM-32D · PZEM-004T v3.0 (UART)</Text>
            </View>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>GIAO THỨC TRUYỀN THÔNG</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>MQTT (QoS 1, Mosquitto Broker) · WebSocket /ws/live</Text>
            </View>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>BACKEND & CƠ SỞ DỮ LIỆU</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>Python 3.11 · FastAPI · SQLite (WAL mode)</Text>
            </View>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>MÔ HÌNH DỰ BÁO AI</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>XGBoost Direct Regression · Seasonal Naive (H=96)</Text>
            </View>
            <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>GIAO DIỆN VẬN HÀNH</Text>
              <Text style={[styles.specVal, { color: colors.text }]}>React Native Expo · TypeScript · TanStack Query</Text>
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
    maxWidth: 1200,
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
    fontSize: 13,
    fontWeight: "500",
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  accountInfo: {
    gap: 2,
  },
  accountUser: {
    fontSize: 15,
    fontWeight: "600",
  },
  accountRole: {
    fontSize: 12,
  },
  logoutBtn: {
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  themeOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themeOptionBtn: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 9,
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
    fontSize: 12,
    marginTop: 4,
  },
  formGroup: {
    gap: 6,
  },
  label: {
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
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  presetTitle: {
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
  saveBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
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
    minWidth: 150,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    gap: 2,
  },
  diagLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  diagVal: {
    fontSize: 20,
    fontWeight: "700",
    marginVertical: 2,
  },
  diagDesc: {
    fontSize: 11,
  },
  bootTableContainer: {
    marginTop: 12,
    gap: 8,
  },
  bootTableTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  bootTable: {
    minWidth: 540,
    borderRadius: 6,
    overflow: "hidden",
  },
  bootTableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  bootHeaderCell: {
    fontSize: 11,
    fontWeight: "600",
  },
  bootCell: {
    fontSize: 12,
  },
  specsList: {
    gap: 8,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  specVal: {
    fontSize: 12,
    fontWeight: "500",
  },
});
