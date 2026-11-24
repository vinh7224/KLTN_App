import os
import sqlite3
from pathlib import Path

# Thư mục gốc backend và đường dẫn cơ sở dữ liệu
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "energy.db"
SCHEMA_PATH = BASE_DIR / "db" / "schema.sql"

# Đọc cấu hình từ biến môi trường (theo mục 4.7)
MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER", "backend")
MQTT_PASS = os.getenv("MQTT_PASS", "matkhau_backend")
JWT_SECRET = os.getenv("JWT_SECRET", "0lrmkTwguZPItMogNbMYktAlpFDfrX0KDcbv_bBwgUdW111QDifFzL80vH3Y_BRo")
DEVICE_ID = os.getenv("DEVICE_ID", "esp32-01")
TZ_OFFSET_H = int(os.getenv("TZ_OFFSET_H", "7"))
TZ_OFFSET = TZ_OFFSET_H * 3600  # Chuyển đổi sang giây (UTC+7 = 25200s)

# Nguồn gốc được phép truy cập CORS
raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()]


def get_db(db_path=None):
    """
    Tạo kết nối SQLite an toàn với WAL mode và timeout 5000ms.
    Trả về sqlite3.Connection với row_factory dạng sqlite3.Row.
    """
    target_path = Path(db_path) if db_path else DB_PATH
    conn = sqlite3.connect(str(target_path), timeout=5.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn


def init_db(db_path=None):
    """Khởi tạo cấu trúc bảng từ schema.sql nếu chưa có"""
    conn = get_db(db_path)
    if SCHEMA_PATH.exists():
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()
    conn.close()


def to_local_time(epoch_utc: int) -> int:
    """Chuyển đổi epoch UTC sang epoch giờ địa phương (UTC+7)"""
    return epoch_utc + TZ_OFFSET


def to_utc_time(epoch_local: int) -> int:
    """Chuyển đổi epoch giờ địa phương sang epoch UTC"""
    return epoch_local - TZ_OFFSET

