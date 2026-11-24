import time
from common import get_db, init_db


def run_once():
    """
    Tính toán và gộp số liệu cho 5 khung 15 phút đã đóng gần nhất.
    Chỉ lấy các mẫu trong clean_samples có flag = 0 (dữ liệu tốt).
    Tính: p_avg = AVG(p), n_samples = COUNT(*), completeness = n / 900.0.
    Ghi bằng INSERT OR REPLACE vào bảng agg_15min.
    """
    init_db()
    conn = get_db()
    now = int(time.time())
    
    # Khung 15 phút đang diễn ra (chưa đóng)
    current_slot = (now // 900) * 900
    # 5 khung 15 phút đã đóng liền trước
    start_ts = current_slot - 5 * 900
    end_ts = current_slot

    query = """
    INSERT OR REPLACE INTO agg_15min (device_id, slot, p_avg, n_samples, completeness)
    SELECT
        device_id,
        (ts / 900) * 900 AS slot,
        AVG(p) AS p_avg,
        COUNT(*) AS n_samples,
        ROUND(CAST(COUNT(*) AS REAL) / 900.0, 4) AS completeness
    FROM clean_samples
    WHERE flag = 0
      AND ts >= ? AND ts < ?
    GROUP BY device_id, (ts / 900) * 900;
    """
    cursor = conn.execute(query, (start_ts, end_ts))
    updated_rows = cursor.rowcount
    conn.commit()
    conn.close()
    
    print(f"📊 [Aggregate] Đã cập nhật tổng hợp 15 phút ({start_ts} -> {end_ts}): {updated_rows} bản ghi.")
    return updated_rows


if __name__ == "__main__":
    run_once()
