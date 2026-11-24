import time
from datetime import datetime, timezone
import aggregate
import forecast
from common import (
    TZ_OFFSET,
    get_db,
    init_db,
)


def main():
    print("⏰ Khởi động scheduler (chu kỳ quét 20s)...")
    init_db()
    
    # Ghi nhận khung 15 phút hiện tại
    now_int = int(time.time())
    last_slot = (now_int // 900) * 900
    last_daily_date = None

    while True:
        try:
            now = int(time.time())
            current_slot = (now // 900) * 900

            # 1. KHI BƯỚC SANG KHUNG 15 PHÚT MỚI
            if current_slot != last_slot:
                print(f"🔔 [Scheduler] Chuyển sang khung 15 phút mới ({current_slot}). Tiến hành tổng hợp và kiểm tra bất thường...")
                last_slot = current_slot
                try:
                    aggregate.run_once()
                    anomalies = forecast.detect_anomalies(now=now)
                    if anomalies:
                        print(f"⚠️ [Scheduler] Đã phát hiện và ghi nhận sự kiện: {anomalies}")
                except Exception as e:
                    print(f"❌ [Scheduler Slot Error]: {e}")

            # 2. LÚC 00:05 MỖI NGÀY (GIỜ ĐỊA PHƯƠNG UTC+7)
            local_ts = now + TZ_OFFSET
            dt_local = datetime.fromtimestamp(local_ts, tz=timezone.utc)
            local_date_str = dt_local.strftime("%Y-%m-%d")
            local_hour = dt_local.hour
            local_minute = dt_local.minute

            if (local_hour == 0 and local_minute >= 5) and (last_daily_date != local_date_str):
                print(f"🌙 [Scheduler Daily Task] Bắt đầu tác vụ định kỳ 00:05 ngày {local_date_str}...")
                last_daily_date = local_date_str
                try:
                    # Huấn luyện mô hình và cập nhật dự báo 24h
                    forecast.run()
                    
                    # Dọn dẹp bản tin thô raw_samples cũ hơn 30 ngày
                    conn = get_db()
                    cutoff_30d = now - 30 * 86400
                    cursor = conn.execute("DELETE FROM raw_samples WHERE recv_ts < ?", (cutoff_30d,))
                    deleted_rows = cursor.rowcount
                    conn.commit()
                    conn.close()
                    print(f"🧹 [Scheduler Cleanup] Đã xóa {deleted_rows} bản tin raw_samples cũ hơn 30 ngày.")
                except Exception as e:
                    print(f"❌ [Scheduler Daily Error]: {e}")

        except Exception as e:
            print(f"❌ [Scheduler Loop Error]: {e}")

        time.sleep(20)


if __name__ == "__main__":
    main()

