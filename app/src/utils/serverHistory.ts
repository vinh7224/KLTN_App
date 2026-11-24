import AsyncStorage from "@react-native-async-storage/async-storage";

const SERVER_HISTORY_KEY = "@server_history";
const MAX_HISTORY = 4;
export const DEFAULT_SERVER = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.10:8000";

/**
 * Lấy danh sách tối đa 4 địa chỉ server gần nhất
 */
export async function getServerHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SERVER_HISTORY_KEY);
    if (!raw) return [DEFAULT_SERVER, "http://localhost:8000"];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [DEFAULT_SERVER, "http://localhost:8000"];
  } catch {
    return [DEFAULT_SERVER, "http://localhost:8000"];
  }
}

/**
 * Lưu địa chỉ server mới vào lịch sử (giữ tối đa 4 địa chỉ, đưa lên đầu)
 */
export async function saveServerToHistory(newUrl: string): Promise<string[]> {
  const cleanUrl = newUrl.trim().replace(/\/+$/, "");
  if (!cleanUrl) return [DEFAULT_SERVER];

  try {
    const current = await getServerHistory();
    const filtered = current.filter((u) => u.toLowerCase() !== cleanUrl.toLowerCase());
    const updated = [cleanUrl, ...filtered].slice(0, MAX_HISTORY);
    await AsyncStorage.setItem(SERVER_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [cleanUrl];
  }
}
