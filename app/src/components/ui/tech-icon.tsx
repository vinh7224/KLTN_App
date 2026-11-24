import React from "react";
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon, G } from "react-native-svg";
import { C } from "@/constants/ui";

export type IconName =
  | "zap"
  | "activity"
  | "gauge"
  | "battery"
  | "waves"
  | "cpu"
  | "radio"
  | "server"
  | "database"
  | "trending-up"
  | "power"
  | "shield"
  | "shield-check"
  | "shield-alert"
  | "alert-triangle"
  | "alert-circle"
  | "sliders"
  | "history"
  | "clock"
  | "settings"
  | "check"
  | "x"
  | "refresh"
  | "log-out"
  | "chevron-right"
  | "chevron-down"
  | "info"
  | "filter"
  | "download"
  | "user"
  | "wifi"
  | "wifi-off"
  | "layers"
  | "grid";

interface TechIconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function TechIcon({
  name,
  size = 20,
  color = C.accent,
  strokeWidth = 2,
}: TechIconProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "zap":
      return (
        <Svg {...commonProps}>
          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </Svg>
      );
    case "activity":
      return (
        <Svg {...commonProps}>
          <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </Svg>
      );
    case "gauge":
      return (
        <Svg {...commonProps}>
          <Path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
          <Path d="M12 13l4-4" />
          <Circle cx="12" cy="13" r="1.5" fill={color} />
        </Svg>
      );
    case "battery":
      return (
        <Svg {...commonProps}>
          <Rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
          <Line x1="22" y1="11" x2="22" y2="13" />
          <Line x1="6" y1="11" x2="6" y2="13" />
          <Line x1="10" y1="11" x2="10" y2="13" />
        </Svg>
      );
    case "waves":
      return (
        <Svg {...commonProps}>
          <Path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
          <Path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
          <Path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        </Svg>
      );
    case "cpu":
      return (
        <Svg {...commonProps}>
          <Rect x="4" y="4" width="16" height="16" rx="2" />
          <Rect x="9" y="9" width="6" height="6" />
          <Line x1="9" y1="1" x2="9" y2="4" />
          <Line x1="15" y1="1" x2="15" y2="4" />
          <Line x1="9" y1="20" x2="9" y2="23" />
          <Line x1="15" y1="20" x2="15" y2="23" />
          <Line x1="20" y1="9" x2="23" y2="9" />
          <Line x1="20" y1="14" x2="23" y2="14" />
          <Line x1="1" y1="9" x2="4" y2="9" />
          <Line x1="1" y1="14" x2="4" y2="14" />
        </Svg>
      );
    case "radio":
      return (
        <Svg {...commonProps}>
          <Circle cx="12" cy="12" r="2" fill={color} />
          <Path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
        </Svg>
      );
    case "server":
      return (
        <Svg {...commonProps}>
          <Rect x="2" y="3" width="20" height="7" rx="2" />
          <Rect x="2" y="14" width="20" height="7" rx="2" />
          <Line x1="6" y1="6.5" x2="6.01" y2="6.5" />
          <Line x1="6" y1="17.5" x2="6.01" y2="17.5" />
        </Svg>
      );
    case "database":
      return (
        <Svg {...commonProps}>
          <Path d="M21 5c0 1.66-4 3-9 3s-9-1.34-9-3 4-3 9-3 9 1.34 9 3z" />
          <Path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <Path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </Svg>
      );
    case "trending-up":
      return (
        <Svg {...commonProps}>
          <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <Polyline points="17 6 23 6 23 12" />
        </Svg>
      );
    case "power":
      return (
        <Svg {...commonProps}>
          <Path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <Line x1="12" y1="2" x2="12" y2="12" />
        </Svg>
      );
    case "shield":
      return (
        <Svg {...commonProps}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
      );
    case "shield-check":
      return (
        <Svg {...commonProps}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <Polyline points="9 12 11 14 15 10" />
        </Svg>
      );
    case "shield-alert":
      return (
        <Svg {...commonProps}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <Line x1="12" y1="8" x2="12" y2="12" />
          <Line x1="12" y1="16" x2="12.01" y2="16" />
        </Svg>
      );
    case "alert-triangle":
      return (
        <Svg {...commonProps}>
          <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <Line x1="12" y1="9" x2="12" y2="13" />
          <Line x1="12" y1="17" x2="12.01" y2="17" />
        </Svg>
      );
    case "alert-circle":
      return (
        <Svg {...commonProps}>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="8" x2="12" y2="12" />
          <Line x1="12" y1="16" x2="12.01" y2="16" />
        </Svg>
      );
    case "sliders":
      return (
        <Svg {...commonProps}>
          <Line x1="4" y1="21" x2="4" y2="14" />
          <Line x1="4" y1="10" x2="4" y2="3" />
          <Line x1="12" y1="21" x2="12" y2="12" />
          <Line x1="12" y1="8" x2="12" y2="3" />
          <Line x1="20" y1="21" x2="20" y2="16" />
          <Line x1="20" y1="12" x2="20" y2="3" />
          <Line x1="1" y1="14" x2="7" y2="14" />
          <Line x1="9" y1="8" x2="15" y2="8" />
          <Line x1="17" y1="16" x2="23" y2="16" />
        </Svg>
      );
    case "history":
      return (
        <Svg {...commonProps}>
          <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <Path d="M3 3v5h5" />
          <Path d="M12 7v5l4 2" />
        </Svg>
      );
    case "clock":
      return (
        <Svg {...commonProps}>
          <Circle cx="12" cy="12" r="10" />
          <Polyline points="12 6 12 12 16 14" />
        </Svg>
      );
    case "settings":
      return (
        <Svg {...commonProps}>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Svg>
      );
    case "check":
      return (
        <Svg {...commonProps}>
          <Polyline points="20 6 9 17 4 12" />
        </Svg>
      );
    case "x":
      return (
        <Svg {...commonProps}>
          <Line x1="18" y1="6" x2="6" y2="18" />
          <Line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
      );
    case "refresh":
      return (
        <Svg {...commonProps}>
          <Path d="M21.5 2v6h-6" />
          <Path d="M21.34 15.57a10 10 0 1 1-.57-8.38l.73-.73" />
        </Svg>
      );
    case "log-out":
      return (
        <Svg {...commonProps}>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <Polyline points="16 17 21 12 16 7" />
          <Line x1="21" y1="12" x2="9" y2="12" />
        </Svg>
      );
    case "chevron-right":
      return (
        <Svg {...commonProps}>
          <Polyline points="9 18 15 12 9 6" />
        </Svg>
      );
    case "chevron-down":
      return (
        <Svg {...commonProps}>
          <Polyline points="6 9 12 15 18 9" />
        </Svg>
      );
    case "info":
      return (
        <Svg {...commonProps}>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="16" x2="12" y2="12" />
          <Line x1="12" y1="8" x2="12.01" y2="8" />
        </Svg>
      );
    case "filter":
      return (
        <Svg {...commonProps}>
          <Polyline points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </Svg>
      );
    case "download":
      return (
        <Svg {...commonProps}>
          <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <Polyline points="7 10 12 15 17 10" />
          <Line x1="12" y1="15" x2="12" y2="3" />
        </Svg>
      );
    case "user":
      return (
        <Svg {...commonProps}>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <Circle cx="12" cy="7" r="4" />
        </Svg>
      );
    case "wifi":
      return (
        <Svg {...commonProps}>
          <Path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <Path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <Line x1="12" y1="20" x2="12.01" y2="20" />
        </Svg>
      );
    case "wifi-off":
      return (
        <Svg {...commonProps}>
          <Line x1="1" y1="1" x2="23" y2="23" />
          <Path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <Path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <Path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <Path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <Line x1="12" y1="20" x2="12.01" y2="20" />
        </Svg>
      );
    case "layers":
      return (
        <Svg {...commonProps}>
          <Polygon points="12 2 2 7 12 12 22 7 12 2" />
          <Polyline points="2 17 12 22 22 17" />
          <Polyline points="2 12 12 17 22 12" />
        </Svg>
      );
    case "grid":
    default:
      return (
        <Svg {...commonProps}>
          <Rect x="3" y="3" width="7" height="7" />
          <Rect x="14" y="3" width="7" height="7" />
          <Rect x="14" y="14" width="7" height="7" />
          <Rect x="3" y="14" width="7" height="7" />
        </Svg>
      );
  }
}
