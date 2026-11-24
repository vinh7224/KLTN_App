import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface RelayEvent {
  id: number;
  device_id: string;
  kind: string;
  value: number; // 1.0 (BẬT) hoặc 0.0 (TẮT)
  threshold: number | null;
  detected_at: number;
  cmd_id: string;
  cmd_sent_at: number | null;
  cmd_acked_at: number | null;
  verified: number | null; // 1: Đúng (khớp tiếp điểm), 0: Sai (lỗi tiếp điểm), null: Chờ phản hồi
  note: string | null;
}

export function useRelay() {
  const [activeCmdId, setActiveCmdId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // 1. Mutation gửi lệnh điều khiển POST /relay
  const sendCommand = useMutation({
    mutationFn: async (on: boolean) => {
      const res = await api<{ cmd_id: string }>("/relay", {
        method: "POST",
        body: JSON.stringify({ on }),
      });
      return res;
    },
    onSuccess: (data) => {
      setActiveCmdId(data.cmd_id);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  // 2. Query kiểm tra trạng thái xác nhận rơ-le GET /relay/{cmd_id} (chu kỳ 1s, dừng khi có cmd_acked_at)
  const statusQuery = useQuery<RelayEvent | null>({
    queryKey: ["relay_cmd", activeCmdId],
    queryFn: async () => {
      if (!activeCmdId) return null;
      return await api<RelayEvent>(`/relay/${activeCmdId}`);
    },
    enabled: !!activeCmdId,
    refetchInterval: (query) => {
      const eventData = query.state.data;
      if (eventData && eventData.cmd_acked_at != null) {
        return false; // Dừng lặp refetch khi ESP32 đã xác nhận tiếp điểm
      }
      return 1000; // Tiếp tục kiểm tra mỗi giây
    },
  });

  return {
    sendCommand,
    activeCmdId,
    setActiveCmdId,
    relayStatus: statusQuery.data ?? null,
    isLoadingStatus: statusQuery.isLoading,
    isPendingCommand: sendCommand.isPending,
  };
}

