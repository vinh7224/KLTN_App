import sqlite3
import time
import random

db = sqlite3.connect("energy.db")
dev_id = "esp32-01"

# 1. Bơm dữ liệu lịch sử 15 phút (cho 7 ngày gần đây) để vẽ biểu đồ Lịch sử (agg_15min)
now_slot = (int(time.time()) // 900) * 900
print("📊 Đang nạp dữ liệu giả lập biểu đồ lịch sử (agg_15min)...")

for i in range(4 * 24 * 7):  # 4 slot/giờ * 24 giờ * 7 ngày = 672 khung
    slot = now_slot - (i * 900)
    # Mô phỏng phụ tải thực tế: ban ngày cao hơn ban đêm
    hour = (slot // 3600 + 7) % 24
    base_p = 600.0 if (7 <= hour <= 22) else 150.0
    p_avg = round(base_p + random.uniform(-100.0, 800.0), 1)
    p_avg = max(50.0, p_avg)
    
    # Giả lập đôi khi có khung thiếu mẫu (completeness < 1.0)
    completeness = 0.85 if random.random() < 0.05 else 1.0
    n_samples = int(900 * completeness)
    
    db.execute("""
        INSERT OR REPLACE INTO agg_15min (device_id, slot, p_avg, n_samples, completeness)
        VALUES (?, ?, ?, ?, ?)
    """, (dev_id, slot, p_avg, n_samples, completeness))

# 2. Bơm dữ liệu dự báo 96 bước (24 giờ tới) cho cả XGBoost và Naive baseline (forecasts)
print("🔮 Đang nạp dữ liệu màn hình dự báo 96 bước (xgboost & naive)...")
for step in range(1, 97):
    slot = now_slot + (step * 900)
    hour = (slot // 3600 + 7) % 24
    expected_p = 800.0 if (17 <= hour <= 21) else 500.0 if (7 <= hour <= 16) else 120.0
    
    # Dự báo XGBoost
    p_hat_xgb = round(expected_p + random.uniform(-50.0, 150.0), 1)
    db.execute("""
        INSERT OR REPLACE INTO forecasts (device_id, made_at, slot, step, p_hat, model)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (dev_id, now_slot, slot, step, p_hat_xgb, "xgboost"))

    # Baseline Seasonal Naive
    p_hat_naive = round(expected_p + random.uniform(-120.0, 200.0), 1)
    db.execute("""
        INSERT OR REPLACE INTO forecasts (device_id, made_at, slot, step, p_hat, model)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (dev_id, now_slot, slot, step, p_hat_naive, "naive"))

# 3. Bơm bảng đánh giá sai số mô hình (forecast_metrics)
print("📈 Đang nạp chỉ số đánh giá sai số mô hình (forecast_metrics)...")
db.execute("""
    INSERT OR REPLACE INTO forecast_metrics (made_at, model, mae, rmse, smape, n)
    VALUES (?, ?, ?, ?, ?, ?)
""", (now_slot, "xgboost", 42.15, 68.30, 8.45, 768))

db.execute("""
    INSERT OR REPLACE INTO forecast_metrics (made_at, model, mae, rmse, smape, n)
    VALUES (?, ?, ?, ?, ?, ?)
""", (now_slot, "naive", 78.60, 115.40, 15.20, 768))

# 4. Bơm một số sự kiện mẫu vào bảng events (cảnh báo quá tải, bất thường, lệnh rơ-le)
print("🔔 Đang nạp danh sách sự kiện mẫu (events)...")
sample_events = [
    (dev_id, "over_power", 2150.0, 2000.0, now_slot - 3600, None, None, None, 1, "Vượt ngưỡng công suất an toàn 2000W"),
    (dev_id, "over_current", 10.8, 10.0, now_slot - 7200, None, None, None, 1, "Vượt ngưỡng dòng điện định mức 10A"),
    (dev_id, "voltage", 248.5, 245.0, now_slot - 14400, None, None, None, 1, "Điện áp lưới tăng cao bất thường"),
    (dev_id, "over_forecast", 1450.0, 950.0, now_slot - 18000, None, None, None, 1, "Phát hiện phụ tải cao bất thường so với dự báo AI (nghi quên tắt thiết bị)"),
    (dev_id, "night_load", 85.0, 30.0, now_slot - 28800, None, None, None, 1, "Tiêu thụ bất thường ban đêm trong khung 00:00-05:00"),
    (dev_id, "relay_cmd", 0, None, now_slot - 4000, "cmd_demo_01", now_slot - 4000, now_slot - 3999, 1, "Lệnh ngắt rơ-le bảo vệ qua ứng dụng Expo"),
]

for ev in sample_events:
    db.execute("""
        INSERT INTO events (device_id, kind, value, threshold, detected_at, cmd_id, cmd_sent_at, cmd_acked_at, verified, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ev)

db.commit()
db.close()
print("✅ Nạp toàn bộ dữ liệu giả lập (Lịch sử, Dự báo, Metrics, Cảnh báo) thành công!")
