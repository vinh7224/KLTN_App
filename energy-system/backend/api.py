import asyncio
import json
import time
from typing import Dict, List
import bcrypt
from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
import paho.mqtt.publish as publish
from pydantic import BaseModel
from common import (
    ALLOWED_ORIGINS,
    DEVICE_ID,
    JWT_SECRET,
    MQTT_HOST,
    MQTT_PASS,
    MQTT_PORT,
    MQTT_USER,
    get_db,
    init_db,
)

# Khởi tạo cơ sở dữ liệu
init_db()

app = FastAPI(title="Hệ thống giám sát và điều khiển điện năng gia đình API")

# Cấu hình CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if "*" not in ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

# Bộ nhớ theo dõi số lần đăng nhập sai: {username: [timestamp, ...]}
failed_login_attempts: Dict[str, List[float]] = {}


class LoginRequest(BaseModel):
    username: str
    password: str


class RelayRequest(BaseModel):
    on: bool


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Xác thực token JWT từ Header Authorization: Bearer <token>"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Thiếu token xác thực")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token đã hết hạn")
    except Exception:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")


def decode_token_raw(token_str: str) -> dict:
    """Xác thực token dạng chuỗi (dùng cho WebSocket)"""
    return jwt.decode(token_str, JWT_SECRET, algorithms=["HS256"])


# ------------------------------------------------------------------------------
# 1. XÁC THỰC VÀ SỨC KHỎE HỆ THỐNG
# ------------------------------------------------------------------------------

@app.get("/health")
def health_check():
    """Kiểm tra trạng thái hoạt động của dịch vụ (không cần token)"""
    return {"status": "ok", "time": time.time()}


@app.post("/auth/login")
def login(req: LoginRequest):
    """
    Đăng nhập hệ thống. Trả về {token, role, username}.
    Giới hạn sai quá 5 lần trong 5 phút (300s) cho cùng 1 username -> HTTP 429.
    """
    now = time.time()
    username = req.username.strip()

    # Làm sạch các lần đăng nhập sai cũ hơn 5 phút
    attempts = failed_login_attempts.get(username, [])
    attempts = [t for t in attempts if now - t < 300.0]
    failed_login_attempts[username] = attempts

    if len(attempts) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Tài khoản này đã đăng nhập sai quá 5 lần trong 5 phút. Vui lòng thử lại sau.",
        )

    conn = get_db()
    row = conn.execute(
        "SELECT username, pw_hash, role FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    conn.close()

    if not row:
        failed_login_attempts[username].append(now)
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")

    pw_hash = row["pw_hash"]
    role = row["role"]

    # Kiểm tra mật khẩu băm bằng bcrypt
    try:
        match = bcrypt.checkpw(req.password.encode("utf-8"), pw_hash.encode("utf-8"))
    except Exception:
        match = False

    if not match:
        failed_login_attempts[username].append(now)
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")

    # Đăng nhập thành công -> Xóa lịch sử sai
    failed_login_attempts.pop(username, None)

    # Token có hiệu lực 24 giờ
    payload = {
        "sub": username,
        "role": role,
        "exp": int(now) + 86400,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return {"token": token, "role": role, "username": username}


# ------------------------------------------------------------------------------
# 2. DỮ LIỆU ĐIỆN NĂNG THỜI GIAN THỰC & LỊCH SỬ
# ------------------------------------------------------------------------------

@app.get("/latest")
def get_latest(user=Depends(verify_token)):
    """Lấy bản ghi telemetry mới nhất có flag < 2 kèm server_ts"""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM clean_samples WHERE flag < 2 ORDER BY ts DESC LIMIT 1"
    ).fetchone()
    conn.close()

    if not row:
        return {"server_ts": time.time()}

    res = dict(row)
    res["server_ts"] = time.time()
    return res


@app.get("/history")
def get_history(
    frm: int = Query(..., description="Epoch UTC bắt đầu"),
    to: int = Query(..., description="Epoch UTC kết thúc"),
    user=Depends(verify_token),
):
    """Lấy lịch sử dữ liệu tổng hợp agg_15min trong khoảng epoch [frm, to]"""
    conn = get_db()
    rows = conn.execute(
        """
        SELECT slot, p_avg, n_samples, completeness
        FROM agg_15min
        WHERE slot BETWEEN ? AND ?
        ORDER BY slot ASC
        """,
        (frm, to),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ------------------------------------------------------------------------------
# 3. DỰ BÁO TIÊU THỤ ĐIỆN NĂNG (XGBOOST, NAIVE) & METRICS
# ------------------------------------------------------------------------------

@app.get("/forecast")
def get_forecast(model: str = Query("xgboost", pattern="^(xgboost|naive)$"), user=Depends(verify_token)):
    """
    Lấy lần dự báo mới nhất của model (xgboost hoặc naive).
    Nếu không có kết quả cho xgboost thì tự động chuyển về naive.
    """
    conn = get_db()
    
    # Tìm made_at mới nhất của model yêu cầu
    latest_made = conn.execute(
        "SELECT MAX(made_at) as latest_made FROM forecasts WHERE model = ?",
        (model,),
    ).fetchone()

    selected_model = model
    made_at = latest_made["latest_made"] if latest_made else None

    # Nếu không có xgboost, tìm naive
    if made_at is None and model != "naive":
        latest_naive = conn.execute(
            "SELECT MAX(made_at) as latest_made FROM forecasts WHERE model = 'naive'"
        ).fetchone()
        if latest_naive and latest_naive["latest_made"]:
            selected_model = "naive"
            made_at = latest_naive["latest_made"]

    if made_at is None:
        conn.close()
        return []

    rows = conn.execute(
        """
        SELECT slot, step, p_hat, model
        FROM forecasts
        WHERE made_at = ? AND model = ?
        ORDER BY step ASC
        """,
        (made_at, selected_model),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/forecast/metrics")
def get_forecast_metrics(user=Depends(verify_token)):
    """Lấy số liệu đánh giá chất lượng mô hình (MAE, RMSE, sMAPE) của lần chạy mới nhất"""
    conn = get_db()
    rows = conn.execute(
        """
        SELECT made_at, model, mae, rmse, smape, n
        FROM forecast_metrics
        WHERE made_at = (SELECT MAX(made_at) FROM forecast_metrics)
        """
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ------------------------------------------------------------------------------
# 4. SỰ KIỆN CẢNH BÁO VÀ ĐIỀU KHIỂN RƠ-LE
# ------------------------------------------------------------------------------

@app.get("/events")
def get_events(user=Depends(verify_token)):
    """Lấy 200 sự kiện mới nhất (cảnh báo ngưỡng, bất thường, lệnh điều khiển)"""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM events ORDER BY detected_at DESC LIMIT 200"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/relay")
def control_relay(req: RelayRequest, user=Depends(verify_token)):
    """
    Gửi lệnh điều khiển rơ-le qua MQTT topic energy/{id}/cmd/relay.
    Chỉ tài khoản admin được phép thực thi. Tài khoản viewer trả về HTTP 403.
    """
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Chỉ tài khoản quản trị (admin) mới có quyền điều khiển thiết bị rơ-le.",
        )

    now_int = int(time.time())
    cmd_id = str(int(time.time() * 1000))  # Mã lệnh dạng epoch milliseconds

    # 1. Gửi lệnh qua MQTT Broker (QoS 1 có xác thực)
    cmd_topic = f"energy/{DEVICE_ID}/cmd/relay"
    cmd_payload = json.dumps({"cmd_id": cmd_id, "on": req.on})
    
    try:
        publish.single(
            topic=cmd_topic,
            payload=cmd_payload,
            qos=1,
            hostname=MQTT_HOST,
            port=MQTT_PORT,
            auth={"username": MQTT_USER, "password": MQTT_PASS},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi gửi lệnh qua MQTT Broker: {str(e)}",
        )

    # 2. Ghi nhận sự kiện vào bảng events
    conn = get_db()
    conn.execute(
        """
        INSERT INTO events (device_id, kind, value, detected_at, cmd_id, cmd_sent_at, note)
        VALUES (?, 'relay_cmd', ?, ?, ?, ?, ?)
        """,
        (
            DEVICE_ID,
            1.0 if req.on else 0.0,
            now_int,
            cmd_id,
            now_int,
            f"Lệnh gửi bởi: {user.get('sub')}",
        ),
    )
    conn.commit()
    conn.close()

    return {"cmd_id": cmd_id}


@app.get("/relay/{cmd_id}")
def get_relay_status(cmd_id: str, user=Depends(verify_token)):
    """Kiểm tra trạng thái xác nhận tiếp điểm phản hồi của lệnh rơ-le theo cmd_id"""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM events WHERE cmd_id = ? ORDER BY id DESC LIMIT 1",
        (cmd_id,),
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin lệnh điều khiển")

    return dict(row)


# ------------------------------------------------------------------------------
# 5. CHẨN ĐOÁN MẠNG VÀ TỈ LỆ MẤT GÓI (DIAGNOSTICS)
# ------------------------------------------------------------------------------

@app.get("/diagnostics")
def get_diagnostics(user=Depends(verify_token)):
    """Thống kê chất lượng đường truyền link_stats và tỉ lệ mất gói theo boot"""
    conn = get_db()
    
    # Thống kê link_stats
    stats_rows = conn.execute(
        "SELECT kind, COUNT(*) as cnt, AVG(value) as avg_val FROM link_stats GROUP BY kind"
    ).fetchall()
    
    link_summary = {
        "recv": 0,
        "dup": 0,
        "disconnect": 0,
        "reconnect_avg_s": 0.0,
    }
    for r in stats_rows:
        k = r["kind"]
        if k in link_summary:
            link_summary[k] = r["cnt"]
        if k == "reconnect_s":
            link_summary["reconnect_avg_s"] = round(float(r["avg_val"] or 0.0), 2)

    # Thống kê tỉ lệ mất gói theo seq trong từng boot
    boot_rows = conn.execute(
        """
        SELECT
            boot,
            MIN(seq) as min_seq,
            MAX(seq) as max_seq,
            COUNT(*) as sample_count
        FROM clean_samples
        WHERE boot IS NOT NULL
        GROUP BY boot
        ORDER BY MAX(ts) DESC
        LIMIT 10
        """
    ).fetchall()

    boot_stats = []
    for b in boot_rows:
        min_s = b["min_seq"]
        max_s = b["max_seq"]
        count = b["sample_count"]
        expected = (max_s - min_s + 1) if (max_s >= min_s) else count
        lost = max(0, expected - count)
        loss_rate = round(lost / expected, 4) if expected > 0 else 0.0
        boot_stats.append({
            "boot": b["boot"],
            "min_seq": min_s,
            "max_seq": max_s,
            "received": count,
            "expected": expected,
            "loss_rate": loss_rate,
        })

    conn.close()
    return {
        "link_stats": link_summary,
        "boot_packet_loss": boot_stats,
    }


# ------------------------------------------------------------------------------
# 6. WEBSOCKET TRUYỀN DỮ LIỆU ĐIỆN NĂNG TRỰC TIẾP (WS LIVE)
# ------------------------------------------------------------------------------

@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket gửi dữ liệu clean_samples mới nhất mỗi 1 giây.
    Nếu token sai hoặc hết hạn -> đóng kết nối với mã 1008 (Policy Violation).
    """
    await websocket.accept()

    try:
        decode_token_raw(token)
    except Exception:
        await websocket.close(code=1008, reason="Xác thực không hợp lệ")
        return

    conn = get_db()
    try:
        while True:
            row = conn.execute(
                "SELECT * FROM clean_samples WHERE flag < 2 ORDER BY ts DESC LIMIT 1"
            ).fetchone()
            
            data = dict(row) if row else {}
            data["server_ts"] = time.time()
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"⚠️ [WebSocket Error]: {e}")
    finally:
        conn.close()
