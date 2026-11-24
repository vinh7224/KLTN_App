import { store } from "./storage";

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const rawBase = await store.get("server");
  const base = (rawBase && rawBase.trim()) ? rawBase.trim().replace(/\/+$/, "") : "http://localhost:8000";
  const token = await store.get("token");

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${cleanPath}`;

  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    if (contentType.includes("application/json")) {
      try {
        const errJson = await res.json();
        if (errJson && errJson.detail) {
          errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {}
    } else {
      const rawText = await res.text();
      if (rawText.includes("<html") || rawText.includes("<!DOCTYPE") || rawText.trim().startsWith("<")) {
        errorDetail = `Máy chủ trả về trang Web HTML thay vì API Backend (HTTP ${res.status}). Hãy đảm bảo dùng cổng :8000 của Backend FastAPI (không phải cổng :8081 của Expo).`;
      }
    }
    throw new Error(errorDetail);
  }

  if (!contentType.includes("application/json")) {
    const rawText = await res.text();
    if (rawText.includes("<html") || rawText.includes("<!DOCTYPE") || rawText.trim().startsWith("<")) {
      throw new Error(
        "Máy chủ phản hồi trang Web HTML thay vì API Backend. Vui lòng kiểm tra lại địa chỉ: phải là cổng :8000 của FastAPI (ví dụ: http://192.168.1.32:8000), không dùng cổng :8081 của Expo."
      );
    }
    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error(`Phản hồi máy chủ không phải JSON hợp lệ: ${rawText.slice(0, 80)}`);
    }
  }

  return res.json();
}
