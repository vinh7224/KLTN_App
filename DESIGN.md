---
name: "IoT Energy Monitoring & Control Design System"
description: "Minimalist Modern IoT Energy Dashboard with Light/Dark/System theme support, validated by UI/UX Pro Max and Impeccable"
colors:
  # Light Mode (Sáng)
  bg-light: "#F8FAFC"
  surface-light: "#FFFFFF"
  text-primary-light: "#0F172A"
  text-secondary-light: "#475569"
  border-light: "#E2E8F0"
  accent-light: "#2563EB"
  accent-hover-light: "#1D4ED8"
  # Dark Mode (Tối)
  bg-dark: "#0B1120"
  surface-dark: "#151E32"
  text-primary-dark: "#F8FAFC"
  text-secondary-dark: "#94A3B8"
  border-dark: "#1E293B"
  accent-dark: "#38BDF8"
  accent-hover-dark: "#0284C7"
  # State Colors (Màu trạng thái theo mục 4.9)
  state-stable-light: "#16A34A"
  state-stable-dark: "#22C55E"
  state-warning-light: "#D97706"
  state-warning-dark: "#FBBF24"
  state-error-light: "#DC2626"
  state-error-dark: "#F87171"
  state-disabled-light: "#94A3B8"
  state-disabled-dark: "#64748B"
  # Chart Colors
  chart-actual-light: "#2563EB"
  chart-actual-dark: "#38BDF8"
  chart-forecast-light: "#D97706"
  chart-forecast-dark: "#FBBF24"
  chart-naive-light: "#64748B"
  chart-naive-dark: "#94A3B8"
typography:
  display:
    fontSize: "28px"
    fontWeight: "700"
    lineHeight: "34px"
  title:
    fontSize: "20px"
    fontWeight: "600"
    lineHeight: "26px"
  heading:
    fontSize: "16px"
    fontWeight: "600"
    lineHeight: "22px"
  body:
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "20px"
  caption:
    fontSize: "12px"
    fontWeight: "500"
    lineHeight: "16px"
  unit:
    fontSize: "11px"
    fontWeight: "400"
    lineHeight: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"
---

## 1. Overview & Rationale (Tổng quan & Lý do lựa chọn)

Phương án thiết kế: **Minimalist Modern IoT Energy Dashboard** (tối giản, dữ liệu trung tâm, chuẩn công nghiệp).
- **Lý do lựa chọn:** Hệ thống giám sát điện năng phục vụ cả kỹ sư vận hành và chủ hộ gia đình; dữ liệu biến thiên liên tục theo từng giây (telemetry) và từng 15 phút (agg/forecast). Việc lạm dụng màu sặc sỡ, neon glow hoặc icon trang trí sẽ làm mỏi mắt và tăng tải trọng nhận thức (cognitive load). Bảng màu trung tính tinh tế kết hợp màu nhấn có chủ đích giúp người dùng tập trung ngay lập tức vào các thông số quan trọng (Công suất, Điện áp, Trạng thái rơ-le).

## 2. Color Palette & Contrast (Bảng màu & Tương phản WCAG AA)

### Chế độ Sáng (Light Mode)
- **Nền chính (Background):** `#F8FAFC` (Slate 50) — dịu mắt, sạch sẽ.
- **Bề mặt Card (Surface):** `#FFFFFF` — phân tách rõ ràng trên nền xám nhạt.
- **Chữ chính (Primary Text):** `#0F172A` (Slate 900) — độ tương phản 14:1 (đạt WCAG AAA).
- **Chữ phụ / Nhãn (Secondary Text):** `#475569` (Slate 600) — độ tương phản 5.2:1 (đạt WCAG AA).
- **Đường viền (Border):** `#E2E8F0` (Slate 200).
- **Màu nhấn chính (Accent):** `#2563EB` (Royal Blue).

### Chế độ Tối (Dark Mode)
- **Nền chính (Background):** `#0B1120` (Deep Dark Slate) — nền xanh than tối sâu.
- **Bề mặt Card (Surface):** `#151E32` (Rich Navy Slate) — tạo chiều sâu tự nhiên.
- **Chữ chính (Primary Text):** `#F8FAFC` (Slate 50) — độ tương phản 15:1 (đạt WCAG AAA).
- **Chữ phụ / Nhãn (Secondary Text):** `#94A3B8` (Slate 400) — độ tương phản 5.1:1 (đạt WCAG AA).
- **Đường viền (Border):** `#1E293B` (Slate 800).
- **Màu nhấn chính (Accent):** `#38BDF8` (Sky Blue).

### Màu trạng thái 4 mức (Semantic Status Colors - Mục 4.9)
1. **Ổn định / Bình thường (Stable / Success):** `#16A34A` (Light) / `#22C55E` (Dark). Dùng cho rơ-le đang đóng bình thường, thông số điện trong ngưỡng an toàn, telemetry cập nhật liên tục.
2. **Cảnh báo (Warning / Anomaly):** `#D97706` (Light) / `#FBBF24` (Dark). Dùng cho sự kiện nghi quên tắt thiết bị (`over_forecast`), tải đêm (`night_load`), dữ liệu bị trễ (> 5s stale).
3. **Lỗi / Nguy hiểm (Error / Trip):** `#DC2626` (Light) / `#F87171` (Dark). Dùng cho quá công suất (`over_power`), quá dòng (`over_current`), bất thường điện áp (`voltage`), lỗi tiếp điểm rơ-le không khớp (`verified = 0`).
4. **Tắt / Vô hiệu hóa (Disabled / Off):** `#94A3B8` (Light) / `#64748B` (Dark). Dùng khi chế độ giám sát đang tắt, rơ-le đang ngắt, thiết bị offline.

## 3. Typography Scale (Thang chữ phân cấp)

Toàn bộ sử dụng System Font (San Francisco trên iOS, Roboto trên Android, Segoe UI / Inter trên Web):
- **Display Metric (28px / Bold 700):** Dành cho số liệu công suất thời gian thực (W), điện áp (V), điện năng (kWh).
- **Title (20px / Semi-bold 600):** Tiêu đề trang, tiêu đề modal xác nhận.
- **Heading (16px / Semi-bold 600):** Tiêu đề phân mục, tiêu đề card lớn.
- **Body (14px / Regular 400):** Văn bản thông tin, giá trị chi tiết, mô tả trạng thái.
- **Caption (12px / Medium 500):** Nhãn thông số (Voltage, Current, Power Factor), badge trạng thái.
- **Unit (11px / Regular 400):** Ký hiệu đơn vị đo (V, A, W, kWh, Hz, PF).

## 4. Spacing & Touch Targets (Khoảng cách & Kích thước chạm)

- **Quy tắc lề di động:** Lề màn hình 16 px (`paddingHorizontal: 16`), khoảng cách giữa các card là 12 px hoặc 16 px.
- **Không cuộn ngang:** Đảm bảo bố cục flex tự co giãn trên bề rộng chuẩn 390 px.
- **Kích thước vùng chạm tối thiểu:** Nút bấm, switch và thẻ tương tác đạt tối thiểu **44×44 px** (theo chuẩn Apple HIG và Material Design 3).
- **Web Desktop (≥ 900 px):** Bố cục dạng lưới 2 đến 3 cột, khung chứa trung tâm `maxWidth: 1200`, thanh điều hướng bên trái rộng 240 px.

## 5. Component Patterns & Visual Hierarchy

- **Stat Card (Thẻ thông số):**
  - Viền mỏng 1 px, bo góc 10 px (`rounded.md`).
  - Phân cấp: Nhãn thông số (chữ hoa nhỏ 12px) ➔ Số liệu nổi bật (28px) ➔ Đơn vị đo (11px) ➔ Thời điểm cập nhật / badge trạng thái.
- **Biểu đồ chuỗi thời gian (Charts):**
  - Dữ liệu thực tế: Đường liền sắc nét (`#2563EB` / `#38BDF8`).
  - Dữ liệu dự báo XGBoost: Đường nét đứt (`#D97706` / `#FBBF24`).
  - Dữ liệu dự báo Naive: Đường chấm mờ (`#64748B` / `#94A3B8`).
  - Điểm bất thường (Anomaly): Đánh dấu chấm tròn viền đỏ nổi bật.
- **Quy trình điều khiển rơ-le an toàn 3 bước:**
  - Bước 1: *"Đã gửi lệnh"* (Badge xanh dương / đang chờ).
  - Bước 2: *"ESP32 đã nhận"* (Badge cam / đã nạp vào phần cứng).
  - Bước 3: *"Tiếp điểm xác nhận"* (Badge xanh lá nếu verified = 1; Badge đỏ cảnh báo nếu verified = 0).
  - Modal xác nhận: Có hộp thoại xác nhận trước khi thực hiện đóng hoặc ngắt.
- **Thẻ trạng thái "Đang tắt giám sát":**
  - Khi tắt: Nền mờ, viền xám, biểu tượng thông báo trung tâm, nút bật giám sát nhanh.
