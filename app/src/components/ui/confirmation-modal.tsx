import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useAppTheme } from "@/lib/theme-context";

export interface ModalStep {
  id: number;
  title: string;
  done: boolean;
  failed?: boolean;
  detail?: string;
}

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  steps?: ModalStep[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  visible,
  title,
  description,
  confirmLabel = "Xác nhận thực hiện",
  cancelLabel = "Hủy thao tác",
  isDanger = false,
  isLoading = false,
  steps,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { colors } = useAppTheme();

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* HEADER */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View
              style={[
                styles.badge,
                { backgroundColor: isDanger ? colors.error : colors.accent },
              ]}
            >
              <Text style={styles.badgeText}>
                {isDanger ? "LƯU Ý AN TOÀN" : "XÁC NHẬN"}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>

          {/* DESCRIPTION */}
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            {description}
          </Text>

          {/* OPTIONAL STEP TIMELINE */}
          {steps && steps.length > 0 && (
            <View
              style={[
                styles.stepsContainer,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.stepsTitle, { color: colors.textSecondary }]}>
                TIẾN TRÌNH XÁC NHẬN 3 BƯỚC KHÉP KÍN:
              </Text>
              {steps.map((st, idx) => {
                const color = st.failed
                  ? colors.error
                  : st.done
                  ? colors.success
                  : colors.textSecondary;
                return (
                  <View key={st.id} style={styles.stepRow}>
                    <View style={[styles.stepDot, { backgroundColor: color }]} />
                    <View style={styles.stepInfo}>
                      <Text
                        style={[
                          styles.stepName,
                          { color: st.done ? colors.text : colors.textSecondary },
                        ]}
                      >
                        Bước {st.id}: {st.title}
                      </Text>
                      {st.detail && (
                        <Text style={[styles.stepDetail, { color: colors.textSecondary }]}>
                          {st.detail}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ACTIONS */}
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.btn,
                styles.cancelBtn,
                { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
              ]}
              disabled={isLoading}
              onPress={onCancel}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.btn,
                styles.confirmBtn,
                {
                  backgroundColor: isDanger ? colors.error : colors.accent,
                  opacity: isLoading ? 0.6 : 1,
                },
              ]}
              disabled={isLoading}
              onPress={onConfirm}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.btnText, { color: "#FFFFFF" }]}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 10,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  header: {
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    alignSelf: "flex-start",
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
  title: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  desc: {
    fontSize: 13,
    lineHeight: 19,
  },
  stepsContainer: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  stepsTitle: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: 12,
    fontWeight: "500",
  },
  stepDetail: {
    fontSize: 11,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  cancelBtn: {
    borderWidth: 1,
  },
  confirmBtn: {
    minWidth: 130,
  },
  btnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
