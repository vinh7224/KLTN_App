PRAGMA journal_mode = WAL;

-- Bảng mẫu dữ liệu thô nhận từ MQTT Broker (giữ tối đa 30 ngày)
CREATE TABLE IF NOT EXISTS raw_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    recv_ts REAL,
    topic TEXT,
    payload TEXT
);
CREATE INDEX IF NOT EXISTS ix_raw_recv_ts ON raw_samples(recv_ts);

-- Bảng dữ liệu sạch từ PZEM-004T (flag: 0=tốt, 1=ngoài khoảng hợp lệ, 2=lỗi đọc)
CREATE TABLE IF NOT EXISTS clean_samples (
    device_id TEXT,
    boot INTEGER,
    seq INTEGER,
    ts INTEGER,
    v REAL,
    i REAL,
    p REAL,
    e REAL,
    f REAL,
    pf REAL,
    flag INTEGER DEFAULT 0,
    recv_ts REAL,
    PRIMARY KEY (device_id, boot, seq)
);
CREATE INDEX IF NOT EXISTS ix_clean_ts ON clean_samples(device_id, ts);

-- Bảng dữ liệu tổng hợp theo khung 15 phút (slot là epoch UTC đầu khung, completeness = n/900)
CREATE TABLE IF NOT EXISTS agg_15min (
    device_id TEXT,
    slot INTEGER,
    p_avg REAL,
    n_samples INTEGER,
    completeness REAL,
    PRIMARY KEY (device_id, slot)
);
CREATE INDEX IF NOT EXISTS ix_agg_slot ON agg_15min(device_id, slot);

-- Bảng dự báo công suất 96 bước (24h)
CREATE TABLE IF NOT EXISTS forecasts (
    device_id TEXT,
    made_at INTEGER,
    slot INTEGER,
    step INTEGER,
    p_hat REAL,
    model TEXT,
    PRIMARY KEY (device_id, made_at, slot, model)
);
CREATE INDEX IF NOT EXISTS ix_forecasts_made_at ON forecasts(made_at, model);

-- Bảng đánh giá chất lượng mô hình dự báo
CREATE TABLE IF NOT EXISTS forecast_metrics (
    made_at INTEGER,
    model TEXT,
    mae REAL,
    rmse REAL,
    smape REAL,
    n INTEGER,
    PRIMARY KEY (made_at, model)
);

-- Bảng ghi nhận sự kiện cảnh báo và lệnh điều khiển rơ-le
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    kind TEXT,
    value REAL,
    threshold REAL,
    detected_at INTEGER,
    cmd_id TEXT,
    cmd_sent_at INTEGER,
    cmd_acked_at INTEGER,
    verified INTEGER,
    note TEXT
);
CREATE INDEX IF NOT EXISTS ix_events_detected_at ON events(detected_at);
CREATE INDEX IF NOT EXISTS ix_events_cmd_id ON events(cmd_id);

-- Bảng thống kê đường truyền mạng (recv, dup, disconnect, reconnect_s)
CREATE TABLE IF NOT EXISTS link_stats (
    device_id TEXT,
    ts INTEGER,
    kind TEXT,
    value REAL
);
CREATE INDEX IF NOT EXISTS ix_link_stats_ts ON link_stats(device_id, ts);

-- Bảng người dùng hệ thống (quản lý phân quyền JWT: role admin/viewer)
CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    pw_hash TEXT NOT NULL,
    role TEXT NOT NULL
);
