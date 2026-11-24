import math
import time
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from common import (
    DEVICE_ID,
    TZ_OFFSET,
    get_db,
    init_db,
    to_local_time,
)


# ==============================================================================
# PHẦN 1: PHÁT HIỆN BẤT THƯỜNG (ANOMALY DETECTION - MỤC 4.6)
# ==============================================================================

def detect_anomalies(now=None, device_id=None):
    """
    Phát hiện bất thường điện năng dựa trên 2 khung 15 phút đã đóng liền nhau gần nhất.
    - Luật night_load: 00:00-05:00 giờ địa phương và actual > 30W.
    - Luật over_forecast: sai số actual - pred vượt ngưỡng sigma MAD theo giờ.
    Cooldown 2 giờ (7200s) cho mỗi loại sự kiện.
    Trả về danh sách loại sự kiện vừa ghi nhận (ví dụ ['night_load']).
    """
    init_db()
    conn = get_db()
    dev = device_id or DEVICE_ID
    now_ts = int(now) if now is not None else int(time.time())

    # Khung tối đa đã đóng tại thời điểm now_ts
    max_closed_slot = (now_ts // 900) * 900 - 900

    # Lấy 2 khung đã đóng gần nhất có dữ liệu thực tế
    rows = conn.execute(
        """
        SELECT slot, p_avg, completeness
        FROM agg_15min
        WHERE device_id = ? AND slot <= ?
        ORDER BY slot DESC
        LIMIT 2
        """,
        (dev, max_closed_slot),
    ).fetchall()

    if len(rows) < 2:
        conn.close()
        return []

    r2, r1 = rows[0], rows[1]  # r2 là khung mới hơn, r1 là khung cũ hơn
    s2, s1 = r2["slot"], r1["slot"]
    actual_2, actual_1 = float(r2["p_avg"]), float(r1["p_avg"])

    # Hai khung phải liền nhau (cách nhau đúng 900s = 15 phút)
    if s2 - s1 != 900:
        conn.close()
        return []

    recorded_kinds = []

    # --------------------------------------------------------------------------
    # 1. LUẬT NIGHT_LOAD: 00:00 - 05:00 giờ địa phương và actual > 30W
    # --------------------------------------------------------------------------
    local_1 = to_local_time(s1)
    local_2 = to_local_time(s2)
    hour_1 = (local_1 % 86400) // 3600
    hour_2 = (local_2 % 86400) // 3600

    if (0 <= hour_1 < 5) and (0 <= hour_2 < 5) and (actual_1 > 30.0) and (actual_2 > 30.0):
        # Kiểm tra cooldown 2 giờ (7200s)
        last_event = conn.execute(
            """
            SELECT detected_at FROM events
            WHERE device_id = ? AND kind = 'night_load' AND detected_at > ?
            ORDER BY detected_at DESC LIMIT 1
            """,
            (dev, now_ts - 7200),
        ).fetchone()

        if not last_event:
            avg_val = round((actual_1 + actual_2) / 2.0, 2)
            conn.execute(
                """
                INSERT INTO events (device_id, kind, value, threshold, detected_at, verified, note)
                VALUES (?, 'night_load', ?, 30.0, ?, 1, ?)
                """,
                (
                    dev,
                    avg_val,
                    now_ts,
                    "Tiêu thụ bất thường ban đêm (vượt 30W trong khung 00:00–05:00)",
                ),
            )
            conn.commit()
            recorded_kinds.append("night_load")
            print(f"🚨 [Anomaly] Phát hiện 'night_load' tại {dev}: P={avg_val}W (ngưỡng: 30W)")

    # --------------------------------------------------------------------------
    # 2. LUẬT OVER_FORECAST: resid = actual - pred vượt ngưỡng sigma của giờ đó
    # --------------------------------------------------------------------------
    pred_row_1 = conn.execute(
        """
        SELECT p_hat FROM forecasts
        WHERE device_id = ? AND slot = ? AND model = 'xgboost' AND made_at <= slot
        ORDER BY made_at DESC LIMIT 1
        """,
        (dev, s1),
    ).fetchone()

    pred_row_2 = conn.execute(
        """
        SELECT p_hat FROM forecasts
        WHERE device_id = ? AND slot = ? AND model = 'xgboost' AND made_at <= slot
        ORDER BY made_at DESC LIMIT 1
        """,
        (dev, s2),
    ).fetchone()

    if pred_row_1 and pred_row_2:
        pred_1 = float(pred_row_1["p_hat"])
        pred_2 = float(pred_row_2["p_hat"])
        resid_1 = actual_1 - pred_1
        resid_2 = actual_2 - pred_2

        # Tính sigma bền vững (MAD) cho giờ địa phương tương ứng trong 7 ngày qua
        def get_hour_threshold(target_hour, target_slot):
            seven_days_ago = target_slot - 7 * 86400
            history_rows = conn.execute(
                """
                SELECT a.slot, a.p_avg, f.p_hat
                FROM agg_15min a
                JOIN forecasts f ON a.device_id = f.device_id AND a.slot = f.slot AND f.model = 'xgboost'
                WHERE a.device_id = ? AND a.slot >= ? AND a.slot < ?
                """,
                (dev, seven_days_ago, target_slot),
            ).fetchall()

            hour_resids = []
            all_resids = []
            for r in history_rows:
                h = ((to_local_time(r["slot"])) % 86400) // 3600
                res = float(r["p_avg"]) - float(r["p_hat"])
                all_resids.append(res)
                if h == target_hour:
                    hour_resids.append(res)

            if len(hour_resids) >= 8:
                med = float(np.median(hour_resids))
                mad = float(np.median(np.abs(np.array(hour_resids) - med)))
                sigma = 1.4826 * mad
            elif len(all_resids) >= 96:
                med = float(np.median(all_resids))
                mad = float(np.median(np.abs(np.array(all_resids) - med)))
                sigma = 1.4826 * mad
            else:
                sigma = 20.0  # Mặc định an toàn khi chưa đủ mẫu

            return max(60.0, 3.0 * sigma)

        th_1 = get_hour_threshold(hour_1, s1)
        th_2 = get_hour_threshold(hour_2, s2)

        if (resid_1 > th_1) and (resid_2 > th_2):
            last_event = conn.execute(
                """
                SELECT detected_at FROM events
                WHERE device_id = ? AND kind = 'over_forecast' AND detected_at > ?
                ORDER BY detected_at DESC LIMIT 1
                """,
                (dev, now_ts - 7200),
            ).fetchone()

            if not last_event:
                avg_act = round((actual_1 + actual_2) / 2.0, 2)
                avg_th = round(((pred_1 + th_1) + (pred_2 + th_2)) / 2.0, 2)
                conn.execute(
                    """
                    INSERT INTO events (device_id, kind, value, threshold, detected_at, verified, note)
                    VALUES (?, 'over_forecast', ?, ?, ?, 1, ?)
                    """,
                    (
                        dev,
                        avg_act,
                        avg_th,
                        now_ts,
                        "Nghi quên tắt thiết bị (công suất thực tế cao hơn dự báo)",
                    ),
                )
                conn.commit()
                recorded_kinds.append("over_forecast")
                print(f"🚨 [Anomaly] Phát hiện 'over_forecast' tại {dev}: Actual={avg_act}W > Ngưỡng={avg_th}W")

    conn.close()
    return recorded_kinds


# ==============================================================================
# PHẦN 2: HUẤN LUYỆN VÀ DỰ BÁO CÔNG SUẤT (XGBOOST, ARIMA, NAIVE - MỤC 4.5)
# ==============================================================================

def load_clean_series(device_id=None):
    """
    Tải chuỗi dữ liệu 15 phút với completeness >= 0.5.
    Đổi sang giờ địa phương, tần suất 15 phút và nội suy tối đa 8 khung.
    """
    conn = get_db()
    dev = device_id or DEVICE_ID
    rows = conn.execute(
        """
        SELECT slot, p_avg
        FROM agg_15min
        WHERE device_id = ? AND completeness >= 0.5
        ORDER BY slot ASC
        """,
        (dev,),
    ).fetchall()
    conn.close()

    if not rows:
        return pd.Series(dtype=float)

    # Chuyển đổi sang local epoch timestamp
    data = [{"ts": to_local_time(r["slot"]), "p": float(r["p_avg"])} for r in rows]
    df = pd.DataFrame(data)
    df["dt"] = pd.to_datetime(df["ts"], unit="s")
    df = df.set_index("dt").sort_index()

    # Tạo chuỗi đều đặn 15 phút và nội suy tối đa 8 khung
    s = df["p"].asfreq("15min")
    s = s.interpolate(method="linear", limit=8)
    return s


def build_xgboost_dataset(series: pd.Series):
    """
    Xây dựng ma trận đặc trưng cho Direct Multi-Horizon (H=96):
    - p0, p1, p4, roll4, roll96, yday, lweek, hour, dow, h
    - Target: p tại t + h
    """
    H = 96
    values = series.values
    index = series.index
    n = len(values)

    X_list = []
    y_list = []
    meta_list = []  # (t_idx, h, target_dt)

    # Cần tối thiểu 672 bước (1 tuần) trước t để tính lweek
    min_t = 672
    max_t = n - H

    if max_t <= min_t:
        return np.array([]), np.array([]), []

    for t in range(min_t, max_t):
        p0 = values[t]
        p1 = values[t - 1]
        p4 = values[t - 4]
        roll4 = np.nanmean(values[t - 3 : t + 1])
        roll96 = np.nanmean(values[t - 95 : t + 1])

        if np.isnan(p0) or np.isnan(p1) or np.isnan(p4):
            continue

        for h in range(1, H + 1):
            target_idx = t + h
            target_val = values[target_idx]
            if np.isnan(target_val):
                continue

            yday_idx = t + h - 96
            yday = values[yday_idx] if yday_idx >= 0 and not np.isnan(values[yday_idx]) else p0

            lweek_idx = t + h - 672
            lweek = values[lweek_idx] if lweek_idx >= 0 and not np.isnan(values[lweek_idx]) else yday

            target_dt = index[target_idx]
            hour = target_dt.hour
            dow = target_dt.dayofweek

            feats = [h, p0, p1, p4, roll4, roll96, yday, lweek, hour, dow]
            X_list.append(feats)
            y_list.append(target_val)
            meta_list.append((t, h, target_dt))

    return np.array(X_list), np.array(y_list), meta_list


def compute_metrics(y_true, y_pred):
    """Tính các chỉ số MAE, RMSE, sMAPE"""
    err = y_true - y_pred
    mae = float(np.mean(np.abs(err)))
    rmse = float(np.sqrt(np.mean(err**2)))
    smape = float(np.mean(200.0 * np.abs(err) / (np.abs(y_true) + np.abs(y_pred) + 1e-6)))
    return mae, rmse, smape, len(y_true)


def produce(device_id=None, xgb_model=None):
    """
    Sinh dự báo 96 bước (24h) từ khung đã đóng gần nhất.
    Ghi vào bảng forecasts cho cả naive và xgboost.
    """
    conn = get_db()
    dev = device_id or DEVICE_ID
    now_int = int(time.time())

    # Lấy khung đã đóng gần nhất từ agg_15min
    latest_row = conn.execute(
        """
        SELECT slot, p_avg FROM agg_15min
        WHERE device_id = ?
        ORDER BY slot DESC LIMIT 1
        """,
        (dev,),
    ).fetchone()

    if not latest_row:
        print("ℹ️ [Forecast] Chưa có dữ liệu agg_15min để dự báo.")
        conn.close()
        return

    last_slot = latest_row["slot"]
    if now_int - last_slot > 3 * 3600:
        print(f"⚠️ [CẢNH BÁO] Dữ liệu agg_15min đã cũ hơn 3 giờ (khung gần nhất: {last_slot}, hiện tại: {now_int})!")

    made_at = now_int
    H = 96

    # 1. Dự báo Seasonal Naive (lấy giá trị tại t + h - 96)
    naive_forecasts = []
    for step in range(1, H + 1):
        target_slot = last_slot + step * 900
        ref_slot = target_slot - 96 * 900
        ref_row = conn.execute(
            "SELECT p_avg FROM agg_15min WHERE device_id = ? AND slot = ?",
            (dev, ref_slot),
        ).fetchone()
        p_hat = float(ref_row["p_avg"]) if ref_row else float(latest_row["p_avg"])
        naive_forecasts.append((dev, made_at, target_slot, step, round(p_hat, 2), "naive"))

    conn.executemany(
        """
        INSERT OR REPLACE INTO forecasts (device_id, made_at, slot, step, p_hat, model)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        naive_forecasts,
    )
    conn.commit()
    print(f"✅ [Forecast] Đã lưu 96 bước dự báo Seasonal Naive (made_at={made_at}).")

    # 2. Dự báo XGBoost (nếu mô hình khả dụng)
    if xgb_model is not None:
        try:
            series = load_clean_series(dev)
            if len(series) >= 672:
                values = series.values
                index = series.index
                t = len(values) - 1

                p0 = values[t]
                p1 = values[t - 1]
                p4 = values[t - 4]
                roll4 = np.nanmean(values[t - 3 : t + 1])
                roll96 = np.nanmean(values[t - 95 : t + 1])

                features_list = []
                for h in range(1, H + 1):
                    target_slot = last_slot + h * 900
                    target_dt = pd.to_datetime(to_local_time(target_slot), unit="s")
                    yday_idx = t + h - 96
                    yday = values[yday_idx] if yday_idx >= 0 and yday_idx < len(values) and not np.isnan(values[yday_idx]) else p0
                    lweek_idx = t + h - 672
                    lweek = values[lweek_idx] if lweek_idx >= 0 and lweek_idx < len(values) and not np.isnan(values[lweek_idx]) else yday

                    hour = target_dt.hour
                    dow = target_dt.dayofweek
                    features_list.append([h, p0, p1, p4, roll4, roll96, yday, lweek, hour, dow])

                preds = xgb_model.predict(np.array(features_list))
                xgb_records = []
                for h, p_val in enumerate(preds, 1):
                    target_slot = last_slot + h * 900
                    xgb_records.append((dev, made_at, target_slot, h, round(max(0.0, float(p_val)), 2), "xgboost"))

                conn.executemany(
                    """
                    INSERT OR REPLACE INTO forecasts (device_id, made_at, slot, step, p_hat, model)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    xgb_records,
                )
                conn.commit()
                print(f"✅ [Forecast] Đã lưu 96 bước dự báo XGBoost (made_at={made_at}).")
        except Exception as e:
            print(f"❌ [Forecast Error] Lỗi sinh dự báo XGBoost: {e}")

    conn.close()


def run(device_id=None):
    """
    Quy trình huấn luyện và đánh giá mô hình:
    - Nếu dữ liệu chưa đủ MIN_DAYS = 10 ngày (960 mẫu 15 phút): chỉ ghi naive.
    - Ngược lại: huấn luyện XGBoost và ARIMA, tính metrics và sinh produce().
    """
    init_db()
    dev = device_id or DEVICE_ID
    series = load_clean_series(dev)
    now_int = int(time.time())

    # Kiểm tra điều kiện đủ 10 ngày (960 mẫu)
    MIN_SAMPLES = 10 * 96  # 960 khung
    if len(series.dropna()) < MIN_SAMPLES:
        print(f"ℹ️ [Forecast] Dữ liệu chưa đủ {MIN_SAMPLES} mẫu (hiện có: {len(series.dropna())}). Chỉ dự báo Naive.")
        produce(dev, xgb_model=None)
        return

    # Huấn luyện XGBoost
    from xgboost import XGBRegressor

    X, y, meta = build_xgboost_dataset(series)
    if len(X) == 0:
        produce(dev, xgb_model=None)
        return

    # Tập kiểm thử: 8 ngày gần nhất (8 * 96 = 768 bước)
    test_horizon_steps = 8 * 96
    split_idx = max(0, len(X) - test_horizon_steps)
    X_train, y_train = X[:split_idx], y[:split_idx]
    X_test, y_test = X[split_idx:], y[split_idx:]

    model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.9,
        random_state=42,
    )
    model.fit(X_train, y_train)

    # Đánh giá trên tập kiểm thử
    if len(X_test) > 0:
        xgb_preds = model.predict(X_test)
        mae, rmse, smape, n = compute_metrics(y_test, xgb_preds)
        conn = get_db()
        conn.execute(
            """
            INSERT OR REPLACE INTO forecast_metrics (made_at, model, mae, rmse, smape, n)
            VALUES (?, 'xgboost', ?, ?, ?, ?)
            """,
            (now_int, mae, rmse, smape, n),
        )

        # Đánh giá Seasonal Naive trên cùng tập test
        naive_preds = X_test[:, 6]  # cột yday
        n_mae, n_rmse, n_smape, n_n = compute_metrics(y_test, naive_preds)
        conn.execute(
            """
            INSERT OR REPLACE INTO forecast_metrics (made_at, model, mae, rmse, smape, n)
            VALUES (?, 'naive', ?, ?, ?, ?)
            """,
            (now_int, n_mae, n_rmse, n_smape, n_n),
        )
        conn.commit()
        conn.close()
        print(f"📈 [Metrics XGBoost] MAE: {mae:.2f}W | RMSE: {rmse:.2f}W | sMAPE: {smape:.2f}% (N={n})")
        print(f"📈 [Metrics Naive]   MAE: {n_mae:.2f}W | RMSE: {n_rmse:.2f}W | sMAPE: {n_smape:.2f}% (N={n_n})")

    # Thử nghiệm ARIMA(2,0,1) với Fourier exog (nếu khả dụng)
    try:
        from statsmodels.tsa.arima.model import ARIMA
        train_s = series.iloc[:split_idx]
        K = 4
        # Tạo đặc trưng Fourier chu kỳ 96
        time_idx = np.arange(len(train_s))
        exog_sin = [np.sin(2 * np.pi * k * time_idx / 96.0) for k in range(1, K + 1)]
        exog_cos = [np.cos(2 * np.pi * k * time_idx / 96.0) for k in range(1, K + 1)]
        is_weekend = (train_s.index.dayofweek >= 5).astype(float)
        exog_train = np.column_stack(exog_sin + exog_cos + [is_weekend])

        arima_model = ARIMA(train_s.values, order=(2, 0, 1), exog=exog_train)
        arima_res = arima_model.fit()
        print("✅ [ARIMA] Đã huấn luyện mô hình ARIMA(2,0,1) với Fourier exog thành công.")
    except Exception as e:
        print(f"⚠️ [ARIMA Warning] Lỗi huấn luyện ARIMA (bỏ qua theo quy định): {e}")

    # Sinh dự báo cho 96 bước tới
    produce(dev, xgb_model=model)


if __name__ == "__main__":
    run()

