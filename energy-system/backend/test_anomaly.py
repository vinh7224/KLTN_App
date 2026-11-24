import time
from common import (
    DEVICE_ID,
    TZ_OFFSET,
    get_db,
    init_db,
)
from forecast import detect_anomalies


def test_night_load_anomaly():
    """
    Kiểm thử chức năng phát hiện bất thường night_load theo mục 5:
    - Chọn khung 02:00 giờ địa phương trong quá khứ 30 ngày.
    - Chèn 2 khung 150 W và 160 W.
    - Gọi detect_anomalies(now=s2 + 910).
    - Kỳ vọng kết quả ['night_load'].
    - Dọn dẹp dữ liệu test sau khi hoàn tất.
    """
    init_db()
    conn = get_db()
    dev = DEVICE_ID
    
    # 1. Chọn thời điểm 10 ngày trước lúc 02:00 sáng giờ địa phương
    current_time = int(time.time())
    past_timestamp = current_time - 10 * 86400
    local_past = past_timestamp + TZ_OFFSET
    day_start_local = (local_past // 86400) * 86400
    
    s1_local = day_start_local + 2 * 3600       # 02:00 giờ địa phương
    s2_local = s1_local + 900                   # 02:15 giờ địa phương
    
    s1 = s1_local - TZ_OFFSET                   # Epoch UTC đầu khung 1
    s2 = s2_local - TZ_OFFSET                   # Epoch UTC đầu khung 2
    test_now = s2 + 910                         # 10s sau khi khung 2 đóng
    
    # Xóa sự kiện cũ nếu có để tránh ảnh hưởng cooldown
    conn.execute(
        "DELETE FROM events WHERE device_id = ? AND kind = 'night_load' AND detected_at = ?",
        (dev, test_now),
    )
    
    # 2. Chèn 2 khung test vào agg_15min
    conn.execute(
        """
        INSERT OR REPLACE INTO agg_15min (device_id, slot, p_avg, n_samples, completeness)
        VALUES (?, ?, 150.0, 900, 1.0)
        """,
        (dev, s1),
    )
    conn.execute(
        """
        INSERT OR REPLACE INTO agg_15min (device_id, slot, p_avg, n_samples, completeness)
        VALUES (?, ?, 160.0, 900, 1.0)
        """,
        (dev, s2),
    )
    conn.commit()

    result = []
    try:
        # 3. Kích hoạt phát hiện bất thường
        result = detect_anomalies(now=test_now, device_id=dev)
        print(f"Kết quả detect_anomalies: {result}")
        assert "night_load" in result, f"Kỳ vọng 'night_load' nhưng nhận được: {result}"
        print("✅ Kiểm thử phát hiện bất thường thành công: ['night_load']")
    finally:
        # 4. Dọn dẹp các dòng dữ liệu test
        conn.execute("DELETE FROM agg_15min WHERE device_id = ? AND slot IN (?, ?)", (dev, s1, s2))
        conn.execute("DELETE FROM events WHERE device_id = ? AND kind = 'night_load' AND detected_at = ?", (dev, test_now))
        conn.commit()
        conn.close()

    return result


if __name__ == "__main__":
    res = test_night_load_anomaly()
    print(res)

