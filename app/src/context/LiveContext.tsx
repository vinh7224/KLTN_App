import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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

export interface LiveContextValue {
  enabled: boolean;
  isMonitoring: boolean;
  connected: boolean;
  data: LiveTelemetry | null;
  latencyMs: number | null;
  stale: boolean;
  reconnect: () => void;
}

const LiveContext = createContext<LiveContextValue>({
  enabled: false,
  isMonitoring: false,
  connected: false,
  data: null,
  latencyMs: null,
  stale: false,
  reconnect: () => {},
});

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { enabled } = useMonitor();
  const { token } = useAuth();

  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<LiveTelemetry | null>(null);
  const [now, setNow] = useState(Date.now());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(1000); // 1s -> 2s -> 4s -> ... -> max 15s
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
          backoffRef.current = 1000; // Reset exponential backoff on successful connect
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
            const isStale = currentNow / 1000 - devTs > 5;

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
        if (isEnabledRef.current) {
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          const delay = backoffRef.current;
          backoffRef.current = Math.min(15000, delay * 2); // Exponential backoff up to 15s
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch {
      setConnected(false);
      if (isEnabledRef.current) {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        const delay = backoffRef.current;
        backoffRef.current = Math.min(15000, delay * 2);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }, [token, cleanup]);

  // Handle lifecycle and token/enabled changes
  useEffect(() => {
    if (enabled && token) {
      backoffRef.current = 1000;
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

  const data = telemetry
    ? {
        ...telemetry,
        stale: !telemetry.ts || now / 1000 - telemetry.ts > 5,
      }
    : null;

  const value: LiveContextValue = {
    enabled,
    isMonitoring: enabled,
    connected,
    data,
    latencyMs: data?.latencyMs ?? null,
    stale: data?.stale ?? false,
    reconnect: () => {
      backoffRef.current = 1000;
      connect();
    },
  };

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue {
  return useContext(LiveContext);
}
