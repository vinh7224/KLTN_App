# CẨM NANG HƯỚNG DẪN KIỂM THỬ TOÀN DIỆN ỨNG DỤNG EXPO VÀ HỆ THỐNG
**Đồ án Khóa luận Tốt nghiệp:** "Hệ thống giám sát và điều khiển điện năng gia đình"  
**Nền tảng:** ESP32 + PZEM-004T + Mosquitto + FastAPI + SQLite WAL + Machine Learning (XGBoost/ARIMA) + Expo React Native  
**Cập nhật lần cuối:** 08/11/2026 (Đã đồng bộ toàn bộ tính năng và bảo mật mới nhất)

---

## 1. TỔNG QUAN KIẾN TRÚC MÔI TRƯỜNG KIỂM THỬ (MOCK ENVIRONMENT)

Để phục vụ công tác kiểm thử, chấm điểm và bảo vệ đồ án mà không bắt buộc phải mang theo phần cứng thật (mạch ESP32, module PZEM-004T và nguồn điện xoay chiều 220V nguy hiểm), toàn bộ hệ sinh thái đã được thiết kế sẵn cơ chế giả lập hoàn chỉnh:

```
                    ┌──────────────────────────────────────────────┐
                    │            MÔI TRƯỜNG GIẢ LẬP MOCK           │
                    │                                              │
                    │  ┌─────────────────┐    ┌─────────────────┐  │
                    │  │  mock_esp32.py  │    │   mock_db.py    │  │
                    │  │ (ESP32 & PZEM)  │    │(Nạp data mẫu DB)│  │
                    │  └────────┬────────┘    └────────┬────────┘  │
                    └───────────┼──────────────────────┼───────────┘
                                │ MQTT                 │ SQLite
                                ▼                      ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                         HỆ THỐNG BACKEND                         │
    │                                                                  │
    │  ┌───────────────┐      ┌─────────────┐      ┌────────────────┐  │
    │  │   Mosquitto   │◄────►│  ingest.py  │─────►│ SQLite WAL DB  │  │
    │  │ Broker (1883) │      │ (Pipeline)  │      │  (energy.db)   │  │
    │  └───────▲───────┘      └─────────────┘      └───────▲────────┘  │
    │          │                                           │           │
    │          │ MQTT Pub/Sub                              │ Query     │
    │  ┌───────▼───────────────────────────────────────────┴────────┐  │
    │  │                 FastAPI Backend (api.py)                   │  │
    │  │    • REST API (HTTP 8000)     • WebSocket (/ws/live)       │  │
    │  │    • Xác thực JWT HS256       • Điều khiển Rơ-le bảo vệ    │  │
    │  └───────────────────────────────▲────────────────────────────┘  │
    └──────────────────────────────────┼───────────────────────────────┘
                                       │ HTTP / WebSocket (JSON)
                                       ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                      ỨNG DỤNG EXPO (FRONTEND)                    │
    │                                                                  │
    │    • Web Desktop (>=900px, Sidebar)  • Mobile (iOS / Android)    │
    │    • Theme Sáng / Tối chuẩn          • Công tắc Bật/Tắt giám sát │
    │    • 6 Màn hình: Tổng quan, Lịch sử, Dự báo, Cảnh báo,           │
    │                  Điều khiển (Xác thực 3 bước), Cài đặt           │
    └──────────────────────────────────────────────────────────────────┘
```

### Các thành phần giả lập chính:
1. **Mạch ESP32 ảo (`backend/mock_esp32.py`)**: 
   - Đăng nhập Mosquitto bằng tài khoản `esp32` / `matkhau_esp32` đã cấp quyền trong ACL.
   - Phát dữ liệu đo lường định kỳ 1 giây/lần lên topic `energy/esp32-01/telemetry`: gồm $U, I, P, E, f, PF, seq, boot, ts$.
   - Lắng nghe lệnh điều khiển rơ-le từ App trên `energy/esp32-01/cmd/relay` và phản hồi trạng thái tiếp điểm phụ qua `energy/esp32-01/relay/state` sau 200 ms.
   - Đăng ký cơ chế Last Will: tự động báo `offline` khi bị ngắt đột ngột.
2. **Kho dữ liệu mẫu đồ thị & cảnh báo (`backend/mock_db.py`)**:
   - Nạp sẵn 7 ngày lịch sử phụ tải 15 phút (`agg_15min`) có mô phỏng khung thiếu mẫu (`completeness < 1.0`).
   - Nạp 96 bước (24 giờ) dự báo tương lai cho cả 2 mô hình `xgboost` và `naive` (`forecasts`).
   - Nạp bảng chỉ số đánh giá sai số mô hình `forecast_metrics` (MAE, RMSE, sMAPE).
   - Nạp sẵn các sự kiện cảnh báo mẫu (`events`): Quá công suất, quá dòng, điện áp bất thường, phát hiện bất thường AI ban đêm, và nhật ký lệnh rơ-le.
3. **Bộ khởi động tự động (`backend/start_all.ps1`)**:
   - Một lệnh duy nhất nạp biến môi trường (`set_env.ps1`), kích hoạt Mosquitto Broker, Ingest Pipeline, Scheduler và FastAPI Uvicorn.

---

## 2. THÔNG TIN XÁC THỰC VÀ TÀI KHOẢN HỆ THỐNG

Hệ thống sử dụng cơ chế bảo mật xác thực Bcrypt băm mật khẩu, cấp mã thông báo JWT HS256 có thời hạn 24 giờ và phân quyền vai trò (Role-based Access Control):

| Tài khoản (Username) | Mật khẩu (Password) | Vai trò (Role) | Quyền hạn trên hệ thống |
| :--- | :---: | :---: | :--- |
| **`admin`** | **`12345`** | `admin` | **Toàn quyền:** Giám sát thời gian thực, xem lịch sử/dự báo, xuất CSV, đổi theme, và **được phép gửi lệnh Bật/Tắt rơ-le**. |
| **`viewer`** | **`12345`** | `viewer` | **Chỉ xem:** Giám sát và tra cứu số liệu. **Bị ẩn nút điều khiển rơ-le trên giao diện**, nếu gọi API trực tiếp sẽ bị chặn với mã `403 Forbidden`. |

> [!NOTE]
> **Cơ chế chống Brute-force:** Nếu nhập sai mật khẩu quá 5 lần trong vòng 5 phút cho cùng một tài khoản, API sẽ tự động khóa và trả về mã lỗi `HTTP 429 Too Many Requests`.

### Cấu hình địa chỉ Máy chủ API (Server URL)
Địa chỉ kết nối được cấu hình tại màn hình **Cài đặt** (Settings) hoặc lưu trong bộ nhớ máy:
- **Kiểm thử trên trình duyệt Web máy tính (PC Web):**  
  `http://localhost:8000`
- **Kiểm thử trên điện thoại thật (qua Expo Go / trình duyệt di động cùng mạng Wi-Fi LAN):**  
  `http://<IP_LAN_CUA_MAY_TINH>:8000` (Ví dụ: `http://192.168.1.10:8000`).  
  *Gõ lệnh `ipconfig` trên PowerShell của máy tính để tra cứu IPv4 Address.*

---

## 3. CÔNG TẮC "BẬT/TẮT GIÁM SÁT" (MONITOR SWITCH)

Điểm nhấn kiến trúc của ứng dụng là cơ chế tiết kiệm tài nguyên mạng và bảo vệ thiết bị:
- **Mặc định khi mở App:** Ứng dụng ở trạng thái **Đang tắt giám sát**.
  - Cả 4 màn hình dữ liệu (*Tổng quan*, *Lịch sử*, *Dự báo*, *Cảnh báo*) hiển thị thông báo an toàn: *"Đang tắt giám sát - Bật giám sát để xem dữ liệu"*.
  - **Không phát sinh bất kỳ yêu cầu mạng (0 network traffic)**, WebSocket đóng hoàn toàn, React Query đặt `enabled: false`.
- **Khi gạt công tắc sang "Bật giám sát":**
  - WebSocket `/ws/live` tự động kết nối và nhận luồng dữ liệu thời gian thực 1 giây/lần.
  - Các màn hình Lịch sử, Dự báo, Cảnh báo tự động gửi request tải số liệu.
- **Tính độc lập:** Hai màn hình **Điều khiển (Control)** và **Cài đặt (Settings)** luôn hoạt động bình thường kể cả khi đang tắt giám sát.

---

## 4. QUY TRÌNH KHỞI CHẠY KIỂM THỬ NHANH (QUICK START)

Thực hiện theo 4 bước tinh gọn sau:

### Bước 1: Khởi động toàn bộ Backend
Mở một cửa sổ PowerShell và chạy file script điều phối:
```powershell
cd D:\Study\KLTN\App\energy-system\backend
.\start_all.ps1
```
*Script sẽ tự động kiểm tra Mosquitto Broker, mở riêng 3 cửa sổ console cho Ingest Pipeline, Scheduler và FastAPI Server (cổng 8000).*

### Bước 2: Nạp dữ liệu nền giả lập (Chỉ cần chạy 1 lần)
Mở một tab PowerShell tại `backend/`:
```powershell
cd D:\Study\KLTN\App\energy-system\backend
.\.venv\Scripts\python mock_db.py
```
*Màn hình sẽ thông báo nạp thành công 672 khung lịch sử (7 ngày), 96 bước dự báo XGBoost & Naive, metrics đánh giá và sự kiện mẫu.*

### Bước 3: Khởi động Mạch ESP32 ảo
Mở một tab PowerShell tại `backend/`:
```powershell
cd D:\Study\KLTN\App\energy-system\backend
.\.venv\Scripts\python mock_esp32.py
```
*Mạch ESP32 ảo bắt đầu kết nối Mosquitto, báo Online và phát dữ liệu đo lường PZEM-004T mỗi 1 giây.*

### Bước 4: Khởi động Ứng dụng Frontend (Expo App)
Mở một tab PowerShell tại thư mục `app/`:
```powershell
cd D:\Study\KLTN\App\app
npm run web
# hoặc: npx expo start
```
*Nhấn phím `w` để mở giao diện Web trên trình duyệt máy tính, hoặc dùng ứng dụng Expo Go trên điện thoại quét mã QR để trải nghiệm di động.*

---

## 5. KỊCH BẢN THỰC CHIẾN KIỂM THỬ TRÊN 6 MÀN HÌNH

### Kịch bản 1: Màn hình Tổng quan (Overview) & Luồng Live Data
1. **Kiểm tra khi tắt giám sát:**
   - Đăng nhập vào tài khoản `admin` (mật khẩu `12345`).
   - Màn hình Tổng quan hiển thị thẻ trạng thái: *"Chế độ giám sát đang tắt"*.
   - Mở Developer Tools (F12) trên trình duyệt $\rightarrow$ Thẻ Network: xác nhận không có bất kỳ WebSocket hay API polling nào chạy ngầm.
2. **Kiểm tra khi bật giám sát:**
   - Gạt công tắc *"Bật giám sát"*.
   - Chấm tròn trạng thái chuyển sang **Màu xanh lá (Dữ liệu trực tiếp)**.
   - Thẻ hiển thị độ trễ WebSocket cập nhật (ví dụ: *Độ trễ: 12 ms*).
   - 6 thẻ thông số điện năng nhảy số liên tục mỗi 1 giây:
     - **Công suất tức thời (W):** Tính từ $U \times I \times PF$, đổi màu cảnh báo nếu $>1500\text{ W}$ hoặc quá tải $>2000\text{ W}$.
     - **Điện áp lưới (V):** Dao động quanh mức $215\text{ V} - 230\text{ V}$ (ngưỡng an toàn $200\text{ V} - 245\text{ V}$).
     - **Dòng điện tiêu thụ (A):** Giá trị dòng tải $0.5\text{ A} - 4.5\text{ A}$.
     - **Điện năng tích lũy (kWh):** Tăng dần theo thời gian đo.
     - **Hệ số công suất (PF):** Hiển thị nhãn *"Hiệu suất tốt ($\ge 0.85$)"*.
     - **Tần số lưới điện (Hz):** Chuẩn định mức $50.0\text{ Hz}$.
3. **Kiểm tra an toàn dữ liệu:**
   - Nếu backend chưa có số đo hoặc số đo bị gián đoạn, các ô giá trị hiển thị ký tự an toàn `--`, tuyệt đối không phát sinh lỗi crash `toFixed`.

---

### Kịch bản 2: Màn hình Điều khiển (Control) & Phân quyền + Xác thực 3 bước Rơ-le
1. **Kiểm tra phân quyền tài khoản `viewer`:**
   - Vào Cài đặt $\rightarrow$ Đăng xuất.
   - Đăng nhập lại với tài khoản `viewer` / `12345`.
   - Vào tab **Điều khiển**:
     - Thấy huy hiệu vai trò: *"Người xem (viewer) - Chế độ chỉ đọc"*.
     - Toàn bộ hai nút bấm *BẬT RƠ-LE* và *NGẮT RƠ-LE* bị **ẩn hoàn toàn**, thay bằng khung thông báo giải thích quyền hạn.
2. **Kiểm tra quy trình xác thực 3 bước với tài khoản `admin`:**
   - Đăng nhập lại với tài khoản `admin` / `12345`.
   - Vào tab **Điều khiển** $\rightarrow$ Thấy đầy đủ nút bấm điều khiển rơ-le.
   - Bấm nút **NGẮT RƠ-LE**:
     - Xuất hiện Modal hộp thoại cảnh báo hai bước yêu cầu xác nhận.
     - Bấm *"Xác nhận ngắt"* trên Modal.
     - Giao diện ngay lập tức kích hoạt quy trình trực quan **3 bước xác nhận**:
       - **Bước 1: Đã gửi lệnh điều khiển** (Hiển thị mã lệnh `cmd_id`, ví dụ: `cmd_173107...`).
       - **Bước 2: ESP32 đã nhận lệnh** (Cửa sổ `mock_esp32.py` in log nhận lệnh, `cmd_acked_at` cập nhật).
       - **Bước 3: Tiếp điểm phụ GPIO27 xác nhận** (Tiếp điểm phản hồi khớp với trạng thái lệnh $\rightarrow$ Chuyển thành icon tích xanh $\checkmark$ *"Tiếp điểm phụ đã xác nhận khớp lệnh"*).
   - Thử tiếp với nút **BẬT RƠ-LE** để kiểm tra chu trình đóng mạch trở lại.

---

### Kịch bản 3: Giả lập Mất kết nối & Cơ chế MQTT Last Will (Offline Detection)
1. Trong khi ứng dụng đang mở màn hình Tổng quan (bật giám sát) và `mock_esp32.py` đang chạy:
2. Nhấn `Ctrl + C` trên cửa sổ `mock_esp32.py` để tắt đột ngột mạch ESP32 ảo.
3. **Hiện tượng quan sát được:**
   - Broker Mosquitto tự động gửi bản tin Last Will `offline` lên topic `energy/esp32-01/status`.
   - Pipeline `ingest.py` bắt được và ghi vào bảng `link_stats` với loại `disconnect`.
   - Sau đúng 5 giây không có bản tin đo mới, cờ `stale` trong App kích hoạt $\rightarrow$ Dấu chấm trạng thái tự động chuyển sang **Màu vàng / Đỏ (Chờ mẫu từ PZEM-004T / Quá 5s)**.
4. **Kiểm tra phục hồi (Reconnect):**
   - Chạy lại `python mock_esp32.py`.
   - Pipeline `ingest.py` tính toán khoảng thời gian gián đoạn và ghi vào `link_stats` với loại `reconnect_s`.
   - Giao diện App ngay lập tức trở lại trạng thái trực tuyến màu xanh lá.

---

### Kịch bản 4: Màn hình Lịch sử (History) & Độ hoàn thiện (Completeness)
1. Bấm vào tab **Lịch sử**:
2. Thử nghiệm bộ lọc thời gian:
   - **Hôm nay**: Lấy các khung 15 phút từ 00:00 sáng nay đến hiện tại.
   - **7 ngày**: Hiển thị phụ tải tổng hợp của cả tuần qua.
   - **30 ngày**: Hiển thị bức tranh tiêu thụ toàn tháng.
3. Quan sát đồ thị phụ tải:
   - Đường phụ tải 15 phút hiển thị mượt mà trên nền lưới tối giản.
   - 4 thẻ tóm tắt: *Tổng tiêu thụ (kWh)*, *Công suất trung bình (W)*, *Công suất đỉnh (W)*, *Độ hoàn thiện (%)*.
4. Bảng số liệu chi tiết & Độ hoàn thiện:
   - Bảng liệt kê từng khung giờ kèm số đo trung bình $P_{avg}$ và tỷ lệ mẫu nhận được so với 900 mẫu lý thuyết.
   - Nếu completeness $\ge 90\%$: Gắn huy hiệu xanh lá *"Đạt chuẩn"*.
   - Nếu completeness $< 90\%$: Gắn huy hiệu vàng *"Thiếu mẫu"*.
5. Kiểm tra tính năng **Xuất CSV**:
   - Bấm nút *"Xuất CSV"*: Trình duyệt tự động tải xuống file `LichSuDienNang_xxx.csv` chứa các cột `ThoiGian, TimestampSlot, CongSuatTrungBinh_W, DoHoanThien_Pct`.

---

### Kịch bản 5: Màn hình Dự báo (Forecast) & Đánh giá sai số (Metrics)
1. Bấm vào tab **Dự báo**:
2. **Đồ thị so sánh 24 giờ tới (96 bước):**
   - **Nét liền (Xanh dương):** Chuỗi công suất thực tế đo được 24 giờ qua.
   - **Nét đứt (Xanh lá / Cam):** Dự báo phụ tải tương lai 96 bước của mô hình AI Machine Learning (`XGBoost Direct`).
   - **Nét chấm (Vàng / Xám):** Đường đối chứng cơ sở (`Baseline Seasonal Naive`).
3. **Thẻ gợi ý vận hành thông minh:**
   - Ứng dụng tự động tìm đỉnh phụ tải dự kiến (ví dụ: *Đỉnh phụ tải 1250 W vào lúc 19:30*).
   - Tự động đưa ra khuyến nghị: Giữ phụ tải an toàn hoặc cảnh báo nếu vượt ngưỡng 2000 W.
4. **Bảng đánh giá sai số mô hình (Benchmark Metrics):**
   - Chuyển sang tab *"Đánh giá sai số"*: So sánh song song giữa mô hình **XGBoost** và **Seasonal Naive** với 3 chỉ số chuẩn quốc tế:
     - **MAE** (Sai số tuyệt đối trung bình - W).
     - **RMSE** (Căn bậc hai sai số toàn phương - W).
     - **sMAPE** (Sai số tỷ lệ phần trăm đối xứng - %).
   - Thấy rõ XGBoost cho độ chính xác vượt trội so với Naive baseline.
5. **Tab Bảng 96 bước:**
   - Tra cứu chi tiết dự báo công suất từng khung giờ trong 24 giờ tới.

---

### Kịch bản 6: Màn hình Cảnh báo (Alerts) & Phát hiện bất thường AI
1. Bấm vào tab **Cảnh báo**:
2. Danh sách 200 sự kiện gần nhất được phân loại trực quan với nhãn tiếng Việt chuẩn:
   - **Quá công suất:** Khi $P > 2000\text{ W}$ (Huy hiệu đỏ - Nguy cấp).
   - **Quá dòng:** Khi $I > 10\text{ A}$ (Huy hiệu đỏ - Nguy cấp).
   - **Điện áp bất thường:** Khi $U < 200\text{ V}$ hoặc $U > 245\text{ V}$ (Huy hiệu vàng - Cảnh báo).
   - **Bất thường AI:**
     - *Nghi quên tắt thiết bị (`over_forecast`):* Khi công suất thực tế cao hơn đáng kể so với dự báo của mô hình.
     - *Tiêu thụ bất thường ban đêm (`night_load`):* Phát hiện phụ tải tiêu thụ $>30\text{ W}$ trong khung giờ 00:00 - 05:00 sáng.
   - **Nhật ký Lệnh rơ-le:** Ghi rõ mã lệnh, thời điểm gửi, thời điểm xác nhận và trạng thái tiếp điểm phụ phản hồi.
3. Thử nghiệm thanh tìm kiếm theo tên sự kiện, thiết bị hoặc ghi chú.
4. Thử nghiệm thanh lọc phân loại (Tất cả, Quá công suất, Quá dòng, Điện áp, Bất thường AI, Lệnh rơ-le).

---

### Kịch bản 7: Màn hình Cài đặt (Settings) & Chẩn đoán đường truyền
1. Bấm vào tab **Cài đặt**:
2. **Chuyển đổi giao diện (Theme):**
   - Bấm chọn lần lượt giữa **Chế độ Sáng (Light)**, **Chế độ Tối (Dark)** và **Theo hệ thống**.
   - Quan sát toàn bộ màu nền, bề mặt card, chữ và viền đổi màu đồng bộ tức thì theo đúng chuẩn WCAG AA trong `DESIGN.md`.
3. **Cấu hình địa chỉ máy chủ:**
   - Hỗ trợ đổi IP máy chủ API và chu kỳ làm mới đồ thị.
   - Có 2 nút bấm chọn nhanh: *Localhost (PC)* và *LAN 192.168.1.10*.
4. **Mục Chẩn đoán chất lượng đường truyền (Network Diagnostics):**
   - Nhúng trực tiếp các chỉ số đo kiểm từ bảng `link_stats`:
     - *Bản tin đã nhận:* Tổng số gói telemetry MQTT đã thu thập.
     - *Tỷ lệ mất gói (%):* Tính toán dựa trên độ liên tục của trường sequence (`seq`) theo từng phiên khởi động (`boot`).
     - *Bản tin trùng lặp:* Phát hiện gói tin trùng lặp `boot` & `seq`.
     - *Số lần ngắt kết nối:* Đếm số lần nhận thông điệp Last Will `offline`.
     - *Thời gian phục hồi trung bình (s):* Thời gian trung bình để thiết bị kết nối lại mạng Wi-Fi/MQTT.
     - *Độ trễ hiển thị (ms):* Độ trễ truyền dẫn luồng WebSocket thời gian thực.
5. **Thông tin tài khoản & Đăng xuất:**
   - Hiển thị tên tài khoản đang đăng nhập, vai trò (`admin` hoặc `viewer`) kèm huy hiệu quyền hạn.
   - Bấm nút **Đăng xuất tài khoản** để thoát phiên làm việc an toàn.

---

## 6. BẢNG ĐỐI CHIẾU TIÊU CHÍ NGHIỆM THU ĐỒ ÁN (CHECKLIST)

| Hạng mục kiểm tra | Tiêu chí yêu cầu | Trạng thái |
| :--- | :--- | :---: |
| **Phần cứng & MQTT** | Đọc Modbus-RTU PZEM, gửi telemetry mỗi giây, Last Will offline, điều khiển rơ-le có tiếp điểm phản hồi | **ĐẠT** |
| **Bảo mật Backend** | Mật khẩu băm Bcrypt, JWT HS256, chống Brute-force 429 sau 5 lần sai, phân quyền role admin/viewer | **ĐẠT** |
| **Cơ sở dữ liệu** | SQLite chế độ WAL, đủ 8 bảng chuẩn hóa, lưu trữ epoch UTC, tự động dọn bản ghi cũ hơn 30 ngày | **ĐẠT** |
| **Machine Learning** | Dự báo 24 giờ (96 bước) bằng XGBoost direct multi-horizon, so sánh ARIMA và Seasonal Naive | **ĐẠT** |
| **Phát hiện bất thường** | Bất thường lệch dự báo (over_forecast theo ngưỡng MAD bền vững) và phụ tải ban đêm (night_load) | **ĐẠT** |
| **WebSocket Live** | Đóng với mã 1008 nếu token sai, truyền dữ liệu mỗi giây, tính độ trễ latencyMs và cảnh báo stale > 5s | **ĐẠT** |
| **Tiết kiệm tài nguyên** | Công tắc "Bật/Tắt giám sát", khi tắt không phát sinh bất kỳ request mạng nào | **ĐẠT** |
| **Điều khiển an toàn** | Modal xác nhận 2 bước, hiển thị trực quan 3 bước phản hồi tiếp điểm phụ, khóa tài khoản viewer | **ĐẠT** |
| **Chuẩn thiết kế UI/UX** | Đạt chuẩn thiết kế Impeccable (0 anti-patterns), hỗ trợ Light/Dark theme, Desktop Navigation Rail | **ĐẠT** |

---

## 7. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

1. **Lỗi WebSocket báo đỏ hoặc không kết nối được:**
   - *Nguyên nhân:* Token hết hạn hoặc chưa đăng nhập.
   - *Cách xử lý:* Vào Cài đặt $\rightarrow$ Đăng xuất $\rightarrow$ Đăng nhập lại với tài khoản `admin` / `12345`.
2. **Lỗi khi test trên điện thoại Expo Go không tải được dữ liệu:**
   - *Nguyên nhân:* Điện thoại không thể gọi tới `localhost` của máy tính.
   - *Cách xử lý:* Vào Cài đặt trên App, đổi địa chỉ máy chủ thành IP mạng LAN của máy tính: `http://192.168.1.X:8000`. Đảm bảo tường lửa Windows (Windows Firewall) cho phép mở cổng 8000 và điện thoại kết nối cùng mạng Wi-Fi với máy tính.
3. **Lỗi đăng nhập báo HTTP 429:**
   - *Nguyên nhân:* Cơ chế bảo mật chống dò mật khẩu kích hoạt khi gõ sai quá 5 lần trong 5 phút.
   - *Cách xử lý:* Đợi 5 phút hoặc khởi động lại tiến trình `api.py` để xóa bộ đếm lưu trong RAM.
4. **Lỗi Mosquitto không chạy được khi gọi `start_all.ps1`:**
   - *Nguyên nhân:* Cổng 1883 đang bị chiếm dụng bởi một tiến trình Mosquitto chạy ngầm dạng Windows Service.
   - *Cách xử lý:* Mở Task Manager tìm `mosquitto.exe` hoặc kiểm tra lệnh `netstat -ano | findstr 1883`. Nếu service đã chạy nền sẵn thì backend vẫn kết nối bình thường, không cần chạy thêm tiến trình mới.
