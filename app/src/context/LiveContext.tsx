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
  relay_state?: number;
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
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      const socket = wsRef.current;
      wsRef.current = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.onopen = null;
      try {
        socket.close();
      } catch {}
    }
    setConnected(false);
  }, []);

  const connect = useCallback(async () => {
    if (!isEnabledRef.current || !tokenRef.current) {
      cleanup();
      return;
    }

    cleanup();

    try {
      const rawBase = await store.get("server");
      const base = rawBase && rawBase.trim() ? rawBase.trim().replace(/\/+$/, "") : "http://localhost:8000";
      const wsProtocol = base.startsWith("https") ? "wss" : "ws";
      const hostPart = base.replace(/^https?:\/\//, "");
      const wsUrl = `${wsProtocol}://${hostPart}/ws/live?token=${encodeURIComponent(tokenRef.current)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current === ws && isEnabledRef.current) {
          setConnected(true);
          backoffRef.current = 1000; // Reset backoff on success
        } else {
          try {
            ws.close();
          } catch {}
        }
      };

      ws.onmessage = (e) => {
        if (wsRef.current !== ws) return;
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
        } catch {
          // Ignore corrupt JSON packets gracefully without crash
        }
      };

      ws.onerror = () => {
        if (wsRef.current === ws) {
          setConnected(false);
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          setConnected(false);
          wsRef.current = null;
          if (isEnabledRef.current && tokenRef.current) {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            const delay = backoffRef.current;
            backoffRef.current = Math.min(15000, delay * 2); // Exponential backoff up to 15s
            reconnectTimerRef.current = setTimeout(() => {
              connect();
            }, delay);
          }
        }
      };
    } catch {
      setConnected(false);
      if (isEnabledRef.current && tokenRef.current) {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        const delay = backoffRef.current;
        backoffRef.current = Math.min(15000, delay * 2);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }, [cleanup]);

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

  // Evaluate stale status continuously (if device timestamp is > 5s behind wall-clock time)
  const isDataStale = telemetry
    ? !telemetry.ts || now / 1000 - telemetry.ts > 5
    : false;

  const data = telemetry
    ? {
        ...telemetry,
        stale: isDataStale,
      }
    : null;

  const value: LiveContextValue = {
    enabled,
    isMonitoring: enabled,
    connected,
    data,
    latencyMs: data?.latencyMs ?? null,
    stale: isDataStale,
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
