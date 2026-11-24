import time
import json
import random
import paho.mqtt.client as mqtt

MQTT_HOST = "localhost"
MQTT_PORT = 1883
DEV_ID = "esp32-01"

t_status = f"energy/{DEV_ID}/status"
t_tele = f"energy/{DEV_ID}/telemetry"
t_cmd = f"energy/{DEV_ID}/cmd/relay"
t_state = f"energy/{DEV_ID}/relay/state"

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
# ĐĂNG NHẬP BẰNG TÀI KHOẢN ESP32 ĐÃ PHÂN QUYỀN TRONG ACL
client.username_pw_set("esp32", "matkhau_esp32")

def on_message(c, userdata, msg):
    if msg.topic == t_cmd:
        data = json.loads(msg.payload)
        on = data["on"]
        cmd_id = data["cmd_id"]
        print(f"📥 [ESP32 Ảo] Nhận lệnh Rơ-le từ App: {'BẬT' if on else 'TẮT'} (ID Lệnh: {cmd_id})")
        
        # Giả lập mạch xử lý mất 200ms rồi phản hồi trạng thái tiếp điểm phụ
        time.sleep(0.2)
        res = {
            "cmd_id": cmd_id,
            "cmd_on": on,
            "ts": int(time.time()),
            "feedback": on # Phản hồi khớp lệnh thành công
        }
        client.publish(t_state, json.dumps(res), retain=True)
        print(f"📤 [ESP32 Ảo] Đã phản hồi xác nhận trạng thái rơ-le thành công.")

client.on_message = on_message

# Cấu hình Last Will: Nếu script này tắt đột ngột, Broker tự phát tin "offline"
client.will_set(t_status, "offline", qos=1, retain=True)
client.connect(MQTT_HOST, MQTT_PORT)
client.subscribe(t_cmd, qos=1)

# Báo thiết bị trực tuyến
client.publish(t_status, "online", retain=True)
seq = 0
boot_id = random.randint(1000, 9999)

print("⚡ MẠCH ESP32 ẢO ĐANG CHẠY... Gửi số đo mỗi 1 giây (Bấm Ctrl+C để dừng)")

client.loop_start()
try:
    while True:
        v = round(random.uniform(215.0, 230.0), 1) # Lưới điện 215V - 230V
        i = round(random.uniform(0.5, 4.5), 2)     # Dòng điện 0.5A - 4.5A
        p = round(v * i * 0.95, 1)                 # Công suất tiêu thụ W
        e = round(12.874 + (seq * 0.001), 3)       # Điện năng tiêu thụ kWh tăng dần
        
        payload = {
            "id": DEV_ID, "boot": boot_id, "seq": seq, "ts": int(time.time()),
            "v": v, "i": i, "p": p, "e": e, "f": 50.0, "pf": 0.95
        }
        
        client.publish(t_tele, json.dumps(payload))
        seq += 1
        time.sleep(1)
except KeyboardInterrupt:
    client.publish(t_status, "offline", retain=True)
    client.loop_stop()
    client.disconnect()
