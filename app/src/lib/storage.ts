import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const web = Platform.OS === "web";
export const store = {
  get: async (k: string): Promise<string | null> => {
    try { return web ? localStorage.getItem(k) : await SecureStore.getItemAsync(k); } catch { return null; }
  },
  set: async (k: string, v: string) => {
    try { web ? localStorage.setItem(k, v) : await SecureStore.setItemAsync(k, v); } catch {}
  },
  del: async (k: string) => {
    try { web ? localStorage.removeItem(k) : await SecureStore.deleteItemAsync(k); } catch {}
  },
};