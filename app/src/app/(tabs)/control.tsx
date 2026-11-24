import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme-context";
import { useRelay, RelayEvent } from "@/hooks/use-relay";

export default function Control() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { colors } = useAppTheme();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [confirmTarget, setConfirmTarget] = useState<boolean | null>(null);
  const { sendCommand, activeCmdId, relayStatus, isPendingCommand } = useRelay();

  // Truy vấn lịch sử các lệnh điều khiển gần nhất (không phụ thuộc chế độ giám sát)
  const historyQuery = useQuery({
    queryKey: ["relayHistory"],
    queryFn: async () => {
      const events = await api<RelayEvent[]>("/events");
      return events.filter((ev) => ev.kind === "relay_cmd").slice(0, 10);
    },
    refetchInterval: 5000,
  });

  const isAcked = !!relayStatus?.cmd_acked_at;
  const isVerified = relayStatus?.verified === 1;
  const isFailed = relayStatus?.verified === 0;

  // 3 bước xác nhận theo đúng mục 4.8
  const steps = [
    {
      id: 1,
      title: "Đã gửi lệnh",
      done: !!activeCmdId,
      detail: activeCmdId ? `Mã lệnh: #${activeCmdId}` : "Chờ phát lệnh",
    },
    {
      id: 2,
      title: "ESP32 đã nhận",
      done: isAcked,
      detail: isAcked ? "ESP32 đã phản hồi qua MQTT" : "Chờ ESP32 phản hồi...",
    },
    {
      id: 3,
      title: "Tiếp điểm xác nhận",
      done: isVerified,
      failed: isFailed,
      detail: isVerified
        ? "Tiếp điểm phụ khớp với trạng thái lệnh (Đúng)"
        : isFailed
        ? "Tiếp điểm phụ không khớp với lệnh (Sai)"
        : "Chờ tiếp điểm phụ GPIO 27...",
    },
  ];

  const handleConfirmAction = () => {
    if (confirmTarget !== null) {
      sendCommand.mutate(confirmTarget);
      setConfirmTarget(null);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>🎛️ Điều khiển Rơ-le</Text>
        {!isMobile && (
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Xác nhận khép kín 3 bước qua tiếp điểm phụ cơ khí (GPIO 27)
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
        {/* SAFETY NOTICE BANNER */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.warning,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.warning }]}>⚠️ Lưu ý an toàn vận hành</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Lệnh điều khiển tác động trực tiếp tới rơ-le cấp nguồn điện. Hệ thống chỉ xác nhận chuyển mạch thành công khi tiếp điểm phụ cơ khí phản hồi về vi điều khiển.
          </Text>
        </View>

        {/* CONTROLS CARD */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Bảng điều khiển rơ-le</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Topic MQTT: energy/esp32-01/cmd/relay (QoS 1)
          </Text>

          {isAdmin ? (
            <View style={styles.buttonRow}>
              {/* NÚT ĐÓNG RƠ-LE */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.success },
                  pressed && styles.buttonPressed,
                  isPendingCommand && styles.buttonDisabled,
                ]}
                disabled={isPendingCommand}
                onPress={() => setConfirmTarget(true)}
              >
                <Text style={styles.actionButtonText}>Đóng rơ-le (Bật tải)</Text>
              </Pressable>

              {/* NÚT NGẮT RƠ-LE */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.error },
                  pressed && styles.buttonPressed,
                  isPendingCommand && styles.buttonDisabled,
                ]}
                disabled={isPendingCommand}
                onPress={() => setConfirmTarget(false)}
              >
                <Text style={styles.actionButtonText}>Ngắt rơ-le (Cắt tải)</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.viewerNotice, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={[styles.viewerNoticeText, { color: colors.textSecondary }]}>
                🔒 Tài khoản của bạn có quyền xem (Viewer). Chức năng đóng/ngắt rơ-le chỉ khả dụng cho Quản trị viên (Admin).
              </Text>
            </View>
          )}

          {sendCommand.isError && (
            <View style={[styles.errorBox, { borderColor: colors.error, backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                Không thể gửi lệnh: {(sendCommand.error as any)?.message || "Lỗi máy chủ"}
              </Text>
            </View>
          )}
        </View>

        {/* 3-STEP VERIFICATION TIMELINE */}
        {activeCmdId && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Tiến trình xác nhận 3 bước</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Theo dõi phản hồi lệnh #{activeCmdId}
            </Text>

            <View style={styles.timeline}>
              {steps.map((st, idx) => {
                const color = st.failed
                  ? colors.error
                  : st.done
                  ? colors.success
                  : colors.textSecondary;

                const isLast = idx === steps.length - 1;

                return (
                  <View key={st.id} style={styles.timelineItem}>
                    <View style={styles.timelineCol}>
                      <View style={[styles.timelineDot, { backgroundColor: color }]} />
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            { backgroundColor: st.done ? colors.success : colors.border },
                          ]}
                        />
                      )}
                    </View>
                    <View style={[styles.timelineContent, !isLast && { paddingBottom: 16 }]}>
                      <View style={styles.timelineRow}>
                        <Text style={[styles.timelineStepTitle, { color: st.done ? colors.text : colors.textSecondary }]}>
                          Bước {st.id}: {st.title}
                        </Text>
                        <Text style={[styles.timelineStatusTag, { color }]}>
                          {st.failed ? "Thất bại" : st.done ? "Hoàn thành" : "Đang chờ"}
                        </Text>
                      </View>
                      <Text style={[styles.timelineStepDetail, { color: colors.textSecondary }]}>
                        {st.detail}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {isFailed && (
              <View style={[styles.errorBox, { borderColor: colors.error, backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  ⚠️ CẢNH BÁO TIẾP ĐIỂM: Rơ-le không chuyển trạng thái thực tế sau khi nhận lệnh!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* RECENT RELAY EVENTS HISTORY */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Lịch sử thao tác rơ-le gần đây</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            10 sự kiện điều khiển gần nhất
          </Text>

          {historyQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 12 }} />
          ) : historyQuery.data && historyQuery.data.length > 0 ? (
            <View style={styles.historyList}>
              {historyQuery.data.map((item) => {
                const isOn = item.value === 1.0;
                const dateStr = new Date(item.detected_at * 1000).toLocaleString("vi-VN");
                const ack = item.cmd_acked_at != null;
                const vState = item.verified === 1 ? "Khớp tiếp điểm" : item.verified === 0 ? "Lỗi tiếp điểm" : "Chờ tiếp điểm";
                const vColor = item.verified === 1 ? colors.success : item.verified === 0 ? colors.error : colors.warning;

                return (
                  <View
                    key={item.id}
                    style={[styles.historyItem, { borderBottomColor: colors.border }]}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={[styles.historyAction, { color: isOn ? colors.success : colors.error }]}>
                        {isOn ? "ĐÓNG RƠ-LE (BẬT)" : "NGẮT RƠ-LE (TẮT)"}
                      </Text>
                      <Text style={[styles.historyTime, { color: colors.textSecondary }]}>
                        {dateStr}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={[styles.historyAck, { color: ack ? colors.text : colors.textSecondary }]}>
                        {ack ? "ESP32 đã nhận" : "Chưa phản hồi"}
                      </Text>
                      <Text style={[styles.historyVerified, { color: vColor }]}>
                        {vState}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Chưa có lịch sử điều khiển rơ-le.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* MODAL XÁC NHẬN TỰ LÀM (HOẠT ĐỘNG HOÀN HẢO CẢ TRÊN WEB VÀ MOBILE) */}
      <Modal
        visible={confirmTarget !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Xác nhận {confirmTarget ? "ĐÓNG RƠ-LE (BẬT ĐIỆN)" : "NGẮT RƠ-LE (CẮT ĐIỆN)"}?
            </Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Hành động này sẽ {confirmTarget ? "cấp nguồn điện trực tiếp" : "ngắt hoàn toàn nguồn điện"} cho tải tiêu thụ. Bạn có chắc chắn muốn thực hiện?
            </Text>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: confirmTarget ? colors.success : colors.error },
                ]}
                onPress={handleConfirmAction}
                disabled={isPendingCommand}
              >
                {isPendingCommand ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Xác nhận</Text>
                )}
              </Pressable>

              <Pressable
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={() => setConfirmTarget(null)}
                disabled={isPendingCommand}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Hủy bỏ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 16,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },
  contentMobile: {
    padding: 12,
    gap: 12,
  },
  card: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  viewerNotice: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  viewerNoticeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
  },
  timeline: {
    marginTop: 12,
    gap: 16,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  timelineCol: {
    alignItems: "center",
    width: 14,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineStepTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  timelineStatusTag: {
    fontSize: 12,
    fontWeight: "500",
  },
  timelineStepDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  historyList: {
    marginTop: 8,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyLeft: {
    flex: 1,
  },
  historyAction: {
    fontSize: 13,
    fontWeight: "600",
  },
  historyTime: {
    fontSize: 12,
    marginTop: 2,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyAck: {
    fontSize: 12,
    fontWeight: "500",
  },
  historyVerified: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
      },
      default: {
        elevation: 8,
      },
    }),
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalConfirmBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
