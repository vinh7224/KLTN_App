# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive (iOS, Android, Web Desktop / PC)

## Product Purpose

Hệ thống giám sát và điều khiển điện năng gia đình toàn diện, kết hợp thu thập dữ liệu thời gian thực từ phần cứng IoT (ESP32, cảm biến PZEM-004T qua MQTT Broker), lưu trữ tổng hợp 15 phút trên SQLite, dự báo phụ tải 24 giờ (96 bước) bằng mô hình Machine Learning (XGBoost, ARIMA, Seasonal Naive) và phát hiện bất thường điện năng (quên tắt thiết bị, tải đêm).

## Users & Roles

1. **Chủ hộ (Homeowner):** Theo dõi tức thời công suất tiêu thụ trong gia đình, xem biểu đồ phụ tải hàng ngày/hàng tháng, ước tính hóa đơn tiền điện, nhận thông báo khi có bất thường (quá tải, nghi quên tắt thiết bị hoặc tải lạ ban đêm).
2. **Quản trị viên (Role: `admin`):** Toàn quyền kiểm soát hệ thống: giám sát mọi thông số kỹ thuật điện chi tiết (V, A, W, PF, Hz, link_stats), phân tích số liệu dự báo & metrics (MAE, RMSE, sMAPE), thực hiện đóng/ngắt rơ-le với quy trình xác nhận an toàn 3 bước.
3. **Người xem (Role: `viewer`):** Xem số liệu giám sát thời gian thực, lịch sử tiêu thụ và danh sách cảnh báo; không có quyền gửi lệnh điều khiển rơ-le (nút điều khiển bị ẩn trên giao diện và API chặn bằng mã lỗi HTTP 403).

## Target Platforms & Form Factors

- **Điện thoại di động (iOS & Android):** Thiết kế mobile-first, lề 16 px, không cuộn ngang ở độ rộng chuẩn 390 px, kích thước vùng chạm tối thiểu 44×44 px, tương thích Dynamic Type và Safe Area.
- **Web Desktop / PC (≥ 900 px):** Bố cục màn hình rộng với thanh Tab Navigation dọc cố định bên trái (Navigation Rail), nội dung căn giữa với giới hạn độ rộng tối đa 1200 px.

## Appearance & Themes

- Hỗ trợ toàn diện 3 chế độ: **Sáng (Light Mode)**, **Tối (Dark Mode)**, và **Tự động theo hệ thống (System Mode)**.
- Người dùng có thể chuyển đổi linh hoạt trong tab Cài đặt; lựa chọn được lưu trữ bền vững.
- Đảm bảo độ tương phản màu sắc đạt chuẩn WCAG AA trên cả hai chế độ nền.

## Main Screen Architecture

Hệ thống tổ chức thành 6 màn hình chính thông qua Expo Router Tab Bar:
1. **Tổng quan (`index.tsx`):**
   - Công tắc Bật/Tắt chế độ giám sát.
   - Thẻ hiển thị các đại lượng điện năng thời gian thực: Điện áp (V), Dòng điện (A), Công suất (W), Năng lượng (kWh), Hệ số công suất (PF), Tần số (Hz).
   - Chỉ số độ trễ mạng (latency) và cờ dữ liệu cũ (stale > 5s).
   - Tóm tắt cảnh báo gần nhất.
2. **Lịch sử (`history.tsx`):**
   - Biểu đồ phụ tải công suất trung bình theo các khung 15 phút.
   - Bộ lọc thời gian (Hôm nay, 7 ngày qua, 30 ngày qua).
   - Bảng tổng hợp chi tiết mức độ hoàn thiện dữ liệu (completeness).
3. **Dự báo (`forecast.tsx`):**
   - Biểu đồ trực quan đường dự báo 24 giờ tới (96 bước 15 phút) so sánh giữa XGBoost và Seasonal Naive.
   - Thẻ số liệu đánh giá độ chính xác của mô hình: MAE, RMSE, sMAPE (%).
4. **Cảnh báo (`alerts.tsx`):**
   - Danh sách 200 sự kiện cảnh báo và hoạt động gần nhất.
   - Nhãn tiếng Việt chuẩn mực: Quá công suất (`over_power`), Quá dòng (`over_current`), Bất thường điện áp (`voltage`), Nghi quên tắt thiết bị (`over_forecast`), Tiêu thụ bất thường ban đêm (`night_load`), Lệnh rơ-le (`relay_cmd`).
5. **Điều khiển (`control.tsx`):**
   - Bảng điều khiển rơ-le dành riêng cho tài khoản `admin`.
   - Quy trình phản hồi 3 bước trực quan: "Đã gửi lệnh" ➔ "ESP32 đã nhận" ➔ "Tiếp điểm xác nhận" (verified).
   - Modal hộp thoại xác nhận trước khi thao tác đóng hoặc ngắt (tương thích cả Web và Mobile).
6. **Cài đặt (`settings.tsx`):**
   - Tùy chọn giao diện (Light / Dark / System).
   - Cấu hình địa chỉ máy chủ kết nối API / WebSocket.
   - Thông tin tài khoản đăng nhập và nút Đăng xuất.
   - Bảng chẩn đoán kỹ thuật (`/diagnostics`): thống kê gói tin (recv, dup, disconnect, reconnect_s) và tỉ lệ mất gói theo từng boot.

## Định nghĩa trạng thái "Đang tắt giám sát" (Monitoring Disabled)

- **Nguyên tắc an toàn:** Mặc định khi mở ứng dụng, chế độ giám sát luôn ở trạng thái **TẮT** (không lưu giá trị bật xuống bộ nhớ máy để tránh tự động kết nối ngoài ý muốn).
- **Ý nghĩa kỹ thuật:**
  - Khi TẮT: Ứng dụng đóng hoàn toàn kết nối WebSocket `/ws/live`, vô hiệu hóa các truy vấn định kỳ (React Query `enabled: false`), không phát sinh bất kỳ request mạng nào từ các tab giám sát.
  - Trạng thái hiển thị: Các tab Tổng quan, Lịch sử, Dự báo, Cảnh báo hiển thị thông báo trạng thái rõ ràng: *"Đang tắt, không đọc dữ liệu — Bật giám sát để xem dữ liệu"*.
- **Tính độc lập:** Hai tab **Điều khiển** và **Cài đặt** hoạt động độc lập, người dùng vẫn có thể kiểm tra trạng thái rơ-le hoặc đổi cấu hình mà không cần bật giám sát.

## Design Principles

1. **Gọn gàng & Tối giản (Minimalist Modern):** Loại bỏ toàn bộ icon trang trí và hiệu ứng hào nhoáng không có giá trị phân tích; ưu tiên khoảng trắng, nhãn chữ rõ ràng và dữ liệu điện năng trung tâm.
2. **Trực quan & Dễ đọc:** Phân cấp thông tin mạch lạc, kích thước chữ số liệu nổi bật, đường biểu đồ sắc nét.
3. **Tin cậy & Trung thực:** Thể hiện chính xác thời điểm cập nhật, độ trễ và cảnh báo khi dữ liệu bị gián đoạn.
4. **Tuyệt đối an toàn khi điều khiển:** Trạng thái rơ-le (đang đóng, đang ngắt, chưa xác nhận, lỗi không khớp tiếp điểm) phải hiển thị minh bạch, không gây hiểu nhầm, luôn yêu cầu người dùng xác nhận trước khi chuyển trạng thái.
