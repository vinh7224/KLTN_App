import json
import time
import paho.mqtt.client as mqtt
from common import (
    MQTT_HOST,
    MQTT_PORT,
    MQTT_USER,
    MQTT_PASS,
    DEVICE_ID,
    get_db,
    init_db,
)

# Khởi tạo cơ sở dữ liệu nếu chưa có
init_db()
db = get_db()

# Bộ đệm trạng thái mất kết nối và chống lặp cảnh báo (cooldown)
state = {
    "down_at": {},         # {device_id: timestamp_disconnect}
    "last_event_time": {}, # {(device_id, kind): timestamp_event}
}

COOLDOWN_S = 60  # Cooldown 60 giây cho mỗi cặp (thiết bị, loại cảnh báo)


def record_stat(dev: str, kind: str, val: float = 1.0):
    """Ghi thống kê đường truyền vào link_stats"""
    now_int = int(time.time())
    db.execute(
        "INSERT INTO link_stats (device_id, ts, kind, value) VALUES (?, ?, ?, ?)",
        (dev, now_int, kind, val),
    )


def is_valid_telemetry(v, i, p, f) -> bool:
    """Kiểm tra điều kiện hợp lệ: 0 <= v <= 300, i >= 0, p >= 0, 45 <= f <= 65"""
    try:
        return (0.0 <= float(v) <= 300.0) and (float(i) >= 0.0) and (float(p) >= 0.0) and (45.0 <= float(f) <= 65.0)
    except (TypeError, ValueError):
        return False


def trigger_event(dev: str, kind: str, value: float, threshold: float):
    """Ghi nhận sự kiện vượt ngưỡng nếu đã qua thời gian cooldown 60s"""
    now_int = int(time.time())
    key = (dev, kind)
    last_time = state["last_event_time"].get(key, 0)
    
    if now_int - last_time < COOLDOWN_S:
        return  # Đang trong thời gian cooldown
        
    state["last_event_time"][key] = now_int
    db.execute(
        """
        INSERT INTO events (device_id, kind, value, threshold, detected_at, verified)
        VALUES (?, ?, ?, ?, ?, 1)
        """,
        (dev, kind, value, threshold, now_int),
    )
    print(f"⚠️ [ALERT] Thiết bị {dev}: {kind} = {value} (ngưỡng: {threshold})")


def check_thresholds(dev: str, v: float, i: float, p: float):
    """Kiểm tra các ngưỡng cảnh báo chỉ áp dụng cho mẫu có flag = 0"""
    # 1. Quá công suất (> 2000 W)
    if p > 2000.0:
        trigger_event(dev, "over_power", float(p), 2000.0)
    # 2. Quá dòng (> 10 A)
    if i > 10.0:
        trigger_event(dev, "over_current", float(i), 10.0)
    # 3. Điện áp ngoài khoảng [200, 245] V
    if v < 200.0:
        trigger_event(dev, "voltage", float(v), 200.0)
    elif v > 245.0:
        trigger_event(dev, "voltage", float(v), 245.0)


def handle_telemetry(payload_str: str, topic: str, now: float):
    """Xử lý bản tin telemetry theo mục 4.4"""
    d = json.loads(payload_str)
    dev = str(d.get("id") or DEVICE_ID)
    
    # Ghi nhận raw_samples cho mọi bản tin
    db.execute(
        "INSERT INTO raw_samples (device_id, recv_ts, topic, payload) VALUES (?, ?, ?, ?)",
        (dev, now, topic, payload_str),
    )
    record_stat(dev, "recv", 1.0)
    
    # Kiểm tra nếu trước đó thiết bị báo offline
    if dev in state["down_at"] and state["down_at"][dev] is not None:
        reconnect_duration = now - state["down_at"][dev]
        record_stat(dev, "reconnect_s", reconnect_duration)
        state["down_at"][dev] = None
        print(f"🔄 [Reconnect] Thiết bị {dev} đã kết nối lại sau {reconnect_duration:.1f}s")

    # Kiểm tra bản tin lỗi đọc cảm biến
    if d.get("err"):
        boot = d.get("boot")
        seq = d.get("seq")
        ts = d.get("ts") or int(now)
        v = d.get("v")
        i = d.get("i")
        p = d.get("p")
        e = d.get("e")
        f = d.get("f")
        pf = d.get("pf")
        flag = 2  # Lỗi đọc cảm biến
        
        db.execute(
            """
            INSERT OR IGNORE INTO clean_samples
            (device_id, boot, seq, ts, v, i, p, e, f, pf, flag, recv_ts)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (dev, boot, seq, ts, v, i, p, e, f, pf, flag, now),
        )
        db.commit()
        return

    # Bản tin telemetry bình thường
    boot = d.get("boot", 0)
    seq = d.get("seq", 0)
    ts = d.get("ts", int(now))
    v = float(d.get("v", 0.0))
    i = float(d.get("i", 0.0))
    p = float(d.get("p", 0.0))
    e = float(d.get("e", 0.0))
    f = float(d.get("f", 0.0))
    pf = float(d.get("pf", 0.0))

    flag = 0 if is_valid_telemetry(v, i, p, f) else 1

    cur = db.execute(
        """
        INSERT OR IGNORE INTO clean_samples
        (device_id, boot, seq, ts, v, i, p, e, f, pf, flag, recv_ts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (dev, boot, seq, ts, v, i, p, e, f, pf, flag, now),
    )

    if cur.rowcount == 0:
        # Bị trùng khóa chính (device_id, boot, seq)
        record_stat(dev, "dup", 1.0)
    else:
        # Mẫu mới hợp lệ: kiểm tra các ngưỡng cảnh báo
        if flag == 0:
            check_thresholds(dev, v, i, p)

    db.commit()


def handle_status(payload_str: str, topic: str, now: float):
    """Xử lý bản tin status (online / offline)"""
    parts = topic.split("/")
    dev = parts[1] if len(parts) > 1 else DEVICE_ID
    status_text = payload_str.strip().lower()
    
    if status_text == "offline":
        record_stat(dev, "disconnect", 1.0)
        state["down_at"][dev] = now
        print(f"🔴 [Status] Thiết bị {dev} ngắt kết nối (offline)")
    elif status_text == "online":
        print(f"🟢 [Status] Thiết bị {dev} đang hoạt động (online)")
    
    db.commit()


def handle_relay_state(payload_str: str, now: float):
    """Xử lý bản tin phản hồi rơ-le từ topic relay/state"""
    d = json.loads(payload_str)
    cmd_id = str(d.get("cmd_id", ""))
    cmd_on = bool(d.get("cmd_on"))
    feedback = bool(d.get("feedback"))
    verified = 1 if (feedback == cmd_on) else 0
    now_int = int(now)

    db.execute(
        """
        UPDATE events
        SET cmd_acked_at = ?, verified = ?
        WHERE cmd_id = ? AND cmd_acked_at IS NULL
        """,
        (now_int, verified, cmd_id),
    )
    db.commit()
    print(f"🔌 [Relay State] Lệnh {cmd_id}: cmd_on={cmd_on}, feedback={feedback}, verified={verified}")


def on_message(client, userdata, msg):
    now = time.time()
    topic = msg.topic
    payload_str = msg.payload.decode("utf-8", errors="replace")
    
    try:
        if topic.endswith("/telemetry"):
            handle_telemetry(payload_str, topic, now)
        elif topic.endswith("/status"):
            handle_status(payload_str, topic, now)
        elif topic.endswith("/relay/state"):
            handle_relay_state(payload_str, now)
    except Exception as e:
        print(f"❌ [Ingest Error] Topic {topic}: {e}")
        db.rollback()


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"✅ Ingest đã kết nối Mosquitto Broker ({MQTT_HOST}:{MQTT_PORT}) thành công!")
        client.subscribe([
            ("energy/+/telemetry", 1),
            ("energy/+/status", 1),
            ("energy/+/relay/state", 1),
        ])
    else:
        print(f"❌ Kết nối Mosquitto thất bại với mã lỗi rc={rc}")


def main():
    print("🚀 Khởi chạy ingest pipeline...")
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(MQTT_USER, MQTT_PASS)
    client.on_connect = on_connect
    client.on_message = on_message
    
    # Kết nối lại tự động khi mất kết nối
    client.reconnect_delay_set(min_delay=1, max_delay=30)
    
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()
