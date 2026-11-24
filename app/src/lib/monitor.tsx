import React, { createContext, useContext, useState } from "react";

interface MonitorContextValue {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggleMonitor: () => void;
}

const MonitorContext = createContext<MonitorContextValue>({
  enabled: false,
  setEnabled: () => {},
  toggleMonitor: () => {},
});

export const useMonitor = () => useContext(MonitorContext);

/**
 * MonitorProvider: Quản lý trạng thái giám sát dữ liệu điện năng.
 * Mặc định luôn là TẮT (enabled = false), không lưu xuống máy để đảm bảo an toàn.
 */
export function MonitorProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  const toggleMonitor = () => {
    setEnabled((prev) => !prev);
  };

  return (
    <MonitorContext.Provider value={{ enabled, setEnabled, toggleMonitor }}>
      {children}
    </MonitorContext.Provider>
  );
}

