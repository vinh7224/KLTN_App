import { useEffect, useState, useCallback, useRef } from "react";
import { store } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import { useMonitor } from "@/lib/monitor";

export interface LiveTelemetry {
  id?: string;
  device_id?: string;
  boot?: number;
  seq?: number;
  ts?: number;
  v?: number;
  i?: number;
  p?: number;
  e?: number;
  f?: number;
  pf?: number;
  server_ts?: number;
  latencyMs: number | null;
  stale: boolean;
}

export interface UseLiveReturn {
  enabled: boolean;
  connected: boolean;
  data: LiveTelemetry | null;
  latencyMs: number | null;
  stale: boolean;
  reconnect?: () => void;
}

/**
 * Hook useLive:
 * - Chỉ mở WebSocket /ws/live khi enabled = true và có token xác thực.
 * - Đóng kết nối khi tắt.
 * - Tự kết nối lại sau 2 giây khi mất kết nối.
 * - Trả về { enabled, connected, data }.
 * - data bao gồm latencyMs và stale (true nếu ts của thiết bị cách hiện tại hơn 5 giây).
 * - Khi tắt (enabled = false): hoàn toàn không phát sinh request mạng nào.
 */
export function useLive(): UseLiveReturn {
  const { enabled } = useMonitor();
  const { token } = useAuth();

  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<LiveTelemetry | null>(null);
  const [now, setNow] = useState(Date.now());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEnabledRef = useRef(enabled);
  isEnabledRef.current = enabled;

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const connect = useCallback(async () => {
    // Nếu giám sát đang tắt hoặc chưa có token thì không kết nối
    if (!isEnabledRef.current || !token) {
      cleanup();
      return;
    }

    cleanup();

    try {
      const rawBase = await store.get("server");
      const base = rawBase && rawBase.trim() ? rawBase.trim().replace(/\/+$/, "") : "http://localhost:8000";
      const wsProtocol = base.startsWith("https") ? "wss" : "ws";
      const hostPart = base.replace(/^https?:\/\//, "");
      const wsUrl = `${wsProtocol}://${hostPart}/ws/live?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isEnabledRef.current) {
          setConnected(true);
        } else {
          ws.close();
        }
      };

      ws.onmessage = (e) => {
        try {
          const raw = JSON.parse(e.data);
          if (raw && typeof raw === "object") {
            const currentNow = Date.now();
            const serverTs = raw.server_ts ? Number(raw.server_ts) : currentNow / 1000;
            const latency = Math.max(0, Math.round(currentNow - serverTs * 1000));
            const devTs = raw.ts ? Number(raw.ts) : serverTs;
            const isStale = (currentNow / 1000 - devTs) > 5;

            const hasMetrics = raw.p != null || raw.v != null || raw.i != null || raw.ts != null;
            if (hasMetrics) {
              setTelemetry({
                ...raw,
                latencyMs: latency,
                stale: isStale,
              });
            } else {
              setTelemetry(null);
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        // Tự kết nối lại sau 2 giây nếu giám sát vẫn đang bật
        if (isEnabledRef.current) {
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, 2000);
        }
      };
    } catch {
      setConnected(false);
      if (isEnabledRef.current) {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 2000);
      }
    }
  }, [token, cleanup]);

  // Điều khiển vòng đời theo trạng thái enabled và token
  useEffect(() => {
    if (enabled && token) {
      connect();
      const tick = setInterval(() => setNow(Date.now()), 1000);
      return () => {
        clearInterval(tick);
        cleanup();
      };
    } else {
      cleanup();
      setTelemetry(null);
    }
  }, [enabled, token, connect, cleanup]);

  // Cập nhật cờ stale thời gian thực nếu quá 5s không có dữ liệu mới
  const data = telemetry
    ? {
        ...telemetry,
        stale: !telemetry.ts || (now / 1000 - telemetry.ts > 5),
      }
    : null;

  return {
    enabled,
    connected,
    data,
    latencyMs: data?.latencyMs ?? null,
    stale: data?.stale ?? false,
    reconnect: connect,
  };
}
