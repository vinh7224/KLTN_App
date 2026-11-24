import React, { useState, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLive } from "@/hooks/use-live";
import { useAppTheme } from "@/lib/theme-context";
import { useRelay, RelayEvent } from "@/hooks/use-relay";
import { SystemHeader } from "@/components/ui/system-header";
import { FuturisticCard } from "@/components/ui/futuristic-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmationModal, ModalStep } from "@/components/ui/confirmation-modal";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";

export default function Control() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { colors } = useAppTheme();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { data: liveData, connected, stale } = useLive();

  const [confirmTarget, setConfirmTarget] = useState<boolean | null>(null);
  const [commandTimeout, setCommandTimeout] = useState(false);
  const { sendCommand, activeCmdId, relayStatus, isPendingCommand, setActiveCmdId } = useRelay();

  // Query recent relay events history
  const historyQuery = useQuery({
    queryKey: ["relayHistory"],
    queryFn: async () => {
      const events = await api<RelayEvent[]>("/events");
      return events.filter((ev) => ev.kind === "relay_cmd").slice(0, 15);
    },
    refetchInterval: 5000,
  });

  // Track command timeout (10 seconds timeout for 3-step closed-loop confirmation)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (activeCmdId && !relayStatus?.cmd_acked_at) {
      setCommandTimeout(false);
      timer = setTimeout(() => {
        setCommandTimeout(true);
      }, 10000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeCmdId, relayStatus?.cmd_acked_at]);

  const isAcked = !!relayStatus?.cmd_acked_at;
  const isVerified = relayStatus?.verified === 1;
  const isFailed = relayStatus?.verified === 0 || commandTimeout;

  // 3-step closed-loop confirmation
  const steps: ModalStep[] = [
    {
      id: 1,
      title: "Đã gửi lệnh (API & MQTT)",
      done: !!activeCmdId,
      detail: activeCmdId ? `Mã lệnh: #${activeCmdId}` : "Chờ gửi lệnh...",
    },
    {
      id: 2,
      title: "ESP32 đã nhận lệnh",
      done: isAcked,
      failed: !isAcked && commandTimeout,
      detail: isAcked
        ? `Xác nhận lúc ${new Date((relayStatus?.cmd_acked_at ?? 0) * 1000).toLocaleTimeString("vi-VN")}`
        : commandTimeout
        ? "Hết thời gian chờ phản hồi ESP32 (Timeout 10s)"
        : "Đang chờ vi điều khiển ESP32 phản hồi qua MQTT...",
    },
    {
      id: 3,
      title: "Tiếp điểm phụ cơ khí (GPIO 27)",
      done: isVerified,
      failed: isFailed,
      detail: isVerified
        ? "Tiếp điểm phụ khớp với trạng thái chuyển mạch (Hợp lệ)"
        : relayStatus?.verified === 0
        ? "CẢNH BÁO: Tiếp điểm phụ không khớp với lệnh điều khiển!"
        : commandTimeout
        ? "Chưa nhận được tín hiệu phản hồi tiếp điểm"
        : "Đang kiểm tra tiếp điểm phụ cơ khí...",
    },
  ];

  const handleConfirmAction = () => {
    if (confirmTarget !== null) {
      setCommandTimeout(false);
      sendCommand.mutate(confirmTarget);
      setConfirmTarget(null);
    }
  };

  const currentRelayState = liveData?.relay_state != null
    ? liveData.relay_state === 1
    : historyQuery.data && historyQuery.data.length > 0
    ? historyQuery.data[0].value === 1.0
    : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SystemHeader
        title="Điều khiển Rơ-le"
        subtitle="Xác nhận khép kín 3 bước qua tiếp điểm phụ cơ khí (GPIO 27)"
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
      >
        {/* SAFETY NOTICE BANNER */}
        <View
          style={[
            styles.noticeCard,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.warning,
            },
          ]}
        >
          <View style={styles.noticeHeader}>
            <View style={[styles.badge, { backgroundColor: colors.warning }]}>
              <Text style={styles.badgeText}>QUY CHUẨN AN TOÀN</Text>
            </View>
            <Text style={[styles.noticeTitle, { color: colors.warning }]}>
              Điều khiển thiết bị tải thực tế
            </Text>
          </View>
          <Text style={[styles.noticeDesc, { color: colors.textSecondary }]}>
            Lệnh điều khiển tác động trực tiếp tới rơ-le cấp nguồn điện cho tải. Hệ thống áp dụng quy trình xác nhận khép kín: chỉ hiển thị chuyển mạch thành công khi có phản hồi tiếp điểm phụ cơ khí từ ESP32.
          </Text>
        </View>

        {/* RELAY STATE & DEVICE OVERVIEW */}
        <FuturisticCard
          title="Trạng thái rơ-le hiện hành"
          subtitle="Giám sát tiếp điểm thực tế và đường truyền điều khiển"
          badge={
            <StatusBadge
              status={
                currentRelayState === true
                  ? "success"
                  : currentRelayState === false
                  ? "offline"
                  : "neutral"
              }
              label={
                currentRelayState === true
                  ? "Tải đang BẬT (Closed)"
                  : currentRelayState === false
                  ? "Tải đang TẮT (Open)"
                  : "Chưa rõ trạng thái"
              }
            />
          }
        >
          <View style={styles.stateGrid}>
            <View
              style={[
                styles.stateCard,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.stateLabel, { color: colors.textSecondary }]}>TRẠNG THÁI TIẾP ĐIỂM</Text>
              <Text
                style={[
                  styles.stateValue,
                  {
                    color:
                      currentRelayState === true
                        ? colors.success
                        : currentRelayState === false
                        ? colors.error
                        : colors.textSecondary,
                  },
                ]}
              >
                {currentRelayState === true
                  ? "ĐANG BẬT"
                  : currentRelayState === false
                  ? "ĐANG TẮT"
                  : "KHÔNG XÁC ĐỊNH"}
              </Text>
              <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
                Tiếp điểm GPIO 27
              </Text>
            </View>

            <View
              style={[
                styles.stateCard,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.stateLabel, { color: colors.textSecondary }]}>KẾT NỐI ESP32</Text>
              <Text
                style={[
                  styles.stateValue,
                  { color: connected && !stale ? colors.success : colors.warning },
                ]}
              >
                {connected && !stale ? "TRỰC TUYẾN" : "GIÁN ĐOẠN"}
              </Text>
              <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
                MQTT Topic: energy/esp32-01/cmd/relay
              </Text>
            </View>

            <View
              style={[
                styles.stateCard,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.stateLabel, { color: colors.textSecondary }]}>MÃ LỆNH MỚI NHẤT</Text>
              <Text style={[styles.stateValue, { color: colors.text }]}>
                {activeCmdId ? `#${activeCmdId.slice(-6)}` : historyQuery.data?.[0]?.cmd_id ? `#${historyQuery.data[0].cmd_id.slice(-6)}` : "--"}
              </Text>
              <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>
                Định danh duy nhất
              </Text>
            </View>
          </View>
        </FuturisticCard>

        {/* CONTROL ACTION BUTTONS */}
        <FuturisticCard
          title="Bảng phát lệnh điều khiển"
          subtitle="Chỉ tài khoản Quản trị viên (admin) mới được phép thực thi"
        >
          {isAdmin ? (
            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.actionButton,
                  styles.onButton,
                  {
                    backgroundColor: colors.success,
                    opacity: isPendingCommand ? 0.6 : 1,
                  },
                ]}
                disabled={isPendingCommand}
                onPress={() => setConfirmTarget(true)}
              >
                <Text style={styles.actionBtnText}>
                  {isPendingCommand && confirmTarget === true
                    ? "Đang gửi lệnh..."
                    : "ĐÓNG RƠ-LE (BẬT TẢI)"}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionButton,
                  styles.offButton,
                  {
                    backgroundColor: colors.error,
                    opacity: isPendingCommand ? 0.6 : 1,
                  },
                ]}
                disabled={isPendingCommand}
                onPress={() => setConfirmTarget(false)}
              >
                <Text style={styles.actionBtnText}>
                  {isPendingCommand && confirmTarget === false
                    ? "Đang gửi lệnh..."
                    : "NGẮT RƠ-LE (CẮT TẢI)"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={[
                styles.viewerBox,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.viewerText, { color: colors.textSecondary }]}>
                Tài khoản của bạn có quyền Người xem (Viewer). Chức năng gửi lệnh đóng/ngắt rơ-le chỉ dành cho Quản trị viên (Admin).
              </Text>
            </View>
          )}

          {sendCommand.isError && (
            <ErrorState
              title="Lỗi gửi lệnh điều khiển"
              message={(sendCommand.error as any)?.message || "Không thể gửi lệnh qua MQTT Broker."}
              onRetry={() => {
                if (confirmTarget !== null) sendCommand.mutate(confirmTarget);
              }}
            />
          )}
        </FuturisticCard>

        {/* 3-STEP CLOSED-LOOP VERIFICATION PROGRESS */}
        {activeCmdId && (
          <FuturisticCard
            title={`Tiến trình xác nhận 3 bước (Lệnh #${activeCmdId})`}
            subtitle="Quy trình xác nhận khép kín hai chiều giữa App, Backend và vi điều khiển ESP32"
            badge={
              <StatusBadge
                status={isVerified ? "success" : isFailed ? "danger" : "connecting"}
                label={
                  isVerified
                    ? "Tiếp điểm đã xác nhận"
                    : isFailed
                    ? "Lỗi tiếp điểm / Timeout"
                    : "Đang xác thực..."
                }
              />
            }
          >
            <View style={styles.stepsTimeline}>
              {steps.map((st, idx) => {
                const color = st.failed
                  ? colors.error
                  : st.done
                  ? colors.success
                  : colors.textSecondary;
                const isLast = idx === steps.length - 1;

                return (
                  <View key={st.id} style={styles.stepItem}>
                    <View style={styles.stepIndicatorCol}>
                      <View style={[styles.stepDot, { backgroundColor: color }]} />
                      {!isLast && (
                        <View
                          style={[
                            styles.stepConnector,
                            {
                              backgroundColor: st.done ? colors.success : colors.border,
                            },
                          ]}
                        />
                      )}
                    </View>

                    <View style={[styles.stepContent, !isLast && { paddingBottom: 16 }]}>
                      <View style={styles.stepTitleRow}>
                        <Text
                          style={[
                            styles.stepTitle,
                            { color: st.done ? colors.text : colors.textSecondary },
                          ]}
                        >
                          Bước {st.id}: {st.title}
                        </Text>
                        <Text style={[styles.stepStatusBadge, { color }]}>
                          {st.failed ? "Thất bại" : st.done ? "Hoàn thành" : "Đang chờ"}
                        </Text>
                      </View>
                      <Text style={[styles.stepDetail, { color: colors.textSecondary }]}>
                        {st.detail}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {isFailed && (
              <View
                style={[
                  styles.errorAlert,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.error },
                ]}
              >
                <Text style={[styles.errorAlertText, { color: colors.error }]}>
                  CẢNH BÁO: Rơ-le chưa chuyển mạch thành công theo lệnh yêu cầu hoặc vi điều khiển không phản hồi tiếp điểm phụ!
                </Text>
              </View>
            )}
          </FuturisticCard>
        )}

        {/* RECENT RELAY EVENTS HISTORY */}
        <FuturisticCard
          title="Lịch sử thao tác rơ-le gần đây"
          subtitle="Nhật ký các lệnh điều khiển và trạng thái tiếp điểm phụ xác nhận"
        >
          {historyQuery.isLoading ? (
            <LoadingState message="Đang tải lịch sử điều khiển rơ-le..." height={120} />
          ) : !historyQuery.data || historyQuery.data.length === 0 ? (
            <EmptyState
              title="Chưa có lệnh điều khiển nào"
              description="Hệ thống chưa ghi nhận sự kiện phát lệnh rơ-le nào trong bảng events."
            />
          ) : (
            <View style={styles.historyList}>
              {historyQuery.data.map((item) => {
                const isOn = item.value === 1.0;
                const dateStr = new Date(item.detected_at * 1000).toLocaleString("vi-VN");
                const vState =
                  item.verified === 1
                    ? "Khớp tiếp điểm"
                    : item.verified === 0
                    ? "Lỗi tiếp điểm"
                    : item.cmd_acked_at != null
                    ? "Đã nhận lệnh"
                    : "Chờ phản hồi";
                const vColor =
                  item.verified === 1
                    ? colors.success
                    : item.verified === 0
                    ? colors.error
                    : colors.warning;

                return (
                  <View
                    key={item.id}
                    style={[styles.historyRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={styles.historyLeft}>
                      <Text
                        style={[
                          styles.historyAction,
                          { color: isOn ? colors.success : colors.error },
                        ]}
                      >
                        {isOn ? "ĐÓNG RƠ-LE (BẬT TẢI)" : "NGẮT RƠ-LE (CẮT TẢI)"}
                      </Text>
                      <Text style={[styles.historyTime, { color: colors.textSecondary }]}>
                        {dateStr} · Lệnh #{item.cmd_id ? item.cmd_id.slice(-6) : item.id}
                      </Text>
                      {item.note && (
                        <Text style={[styles.historyNote, { color: colors.textSecondary }]}>
                          {item.note}
                        </Text>
                      )}
                    </View>

                    <View style={styles.historyRight}>
                      <View style={[styles.statusTag, { borderColor: vColor }]}>
                        <Text style={[styles.statusTagText, { color: vColor }]}>
                          {vState}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </FuturisticCard>
      </ScrollView>

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal
        visible={confirmTarget !== null}
        title={confirmTarget === true ? "Xác nhận Đóng Rơ-le (Bật Tải)" : "Xác nhận Ngắt Rơ-le (Cắt Tải)"}
        description={
          confirmTarget === true
            ? "Hành động này sẽ gửi lệnh đóng rơ-le qua MQTT topic để cấp điện cho các thiết bị phụ tải tiêu thụ. Bạn có chắc chắn muốn thực hiện?"
            : "Hành động này sẽ ngắt nguồn điện cấp cho tải ngay lập tức. Hãy đảm bảo các thiết bị điện tử đang vận hành an toàn trước khi ngắt nguồn!"
        }
        confirmLabel={confirmTarget === true ? "Xác nhận Bật tải" : "Xác nhận Cắt tải"}
        cancelLabel="Hủy bỏ"
        isDanger={confirmTarget === false}
        isLoading={isPendingCommand}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmTarget(null)}
      />
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
  noticeCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  noticeDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  stateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  stateCard: {
    flex: 1,
    minWidth: 160,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    gap: 2,
  },
  stateLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  stateValue: {
    fontSize: 16,
    fontWeight: "700",
    marginVertical: 2,
  },
  stateDesc: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 180,
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  onButton: {},
  offButton: {},
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  viewerBox: {
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
  },
  viewerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  stepsTimeline: {
    paddingVertical: 4,
  },
  stepItem: {
    flexDirection: "row",
    gap: 12,
  },
  stepIndicatorCol: {
    alignItems: "center",
    width: 16,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 2,
  },
  stepConnector: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  stepStatusBadge: {
    fontSize: 11,
    fontWeight: "600",
  },
  stepDetail: {
    fontSize: 12,
  },
  errorAlert: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
  },
  errorAlertText: {
    fontSize: 12,
    fontWeight: "500",
  },
  historyList: {
    gap: 0,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  historyLeft: {
    flex: 1,
    gap: 2,
  },
  historyAction: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  historyTime: {
    fontSize: 11,
  },
  historyNote: {
    fontSize: 11,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
