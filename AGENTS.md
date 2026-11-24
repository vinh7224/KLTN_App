# HƯỚNG DẪN DÀNH CHO AI AGENT & DEVELOPER (AGENTS.MD)

Dự án này là hệ thống IoT thông minh giám sát, điều khiển và dự báo điện năng (ESP32, PZEM-004T, MQTT, Machine Learning) với ứng dụng đa nền tảng (Web Desktop, Web Mobile, Android, iOS) xây dựng trên **Expo / React Native**.

---

## 1. TỔNG QUAN VÀ PHÂN VAI 2 SKILL THIẾT KẾ

Dự án đã tích hợp sẵn 2 bộ kỹ năng thiết kế chuyên nghiệp trong `.agents/skills/`. AI Agent **bắt buộc** phối hợp 2 skill này theo nguyên tắc phân chia trách nhiệm:

| Skill | Vai trò cốt lõi | Khi nào sử dụng? |
| :--- | :--- | :--- |
| **`ui-ux-pro-max`** | **Design Intelligence & Knowledge Base**<br>*(Thư viện tiêu chuẩn & Tri thức thiết kế)* | **Giai đoạn Chuẩn bị & Xây dựng:**<br>• Tra cứu phong cách (`styles.csv`, ví dụ: `data-dense-dashboard`).<br>• Tra cứu bảng màu (`colors.csv`), font pairing (`typography.csv`).<br>• Tra cứu chuẩn biểu đồ (`charts.csv`) cho dữ liệu điện tử / chuỗi thời gian.<br>• Tra cứu nguyên tắc UX (`ux-guidelines.csv`) và best practice cho stack **React Native** (`stacks/react-native.csv`). |
| **`impeccable`** | **Design Director & Quality Auditor**<br>*(Đánh giá Heuristic & Tinh chỉnh hoàn thiện)* | **Giai đoạn Đánh giá, Thẩm định & Nghiệm thu:**<br>• Đánh giá UX và tải nhận thức (`/impeccable critique`).<br>• Kiểm định chất lượng kỹ thuật, a11y, safe-area, contrast (`/impeccable audit`).<br>• Tinh chỉnh chi tiết bề mặt trước khi bàn giao (`/impeccable polish`).<br>• Làm rõ thông điệp (`/impeccable clarify`), tinh gọn giao diện (`/impeccable distill`).<br>• Quét lỗi anti-pattern tự động bằng engine (`impeccable detect`). |

---

## 2. QUY TRÌNH PHỐI HỢP 4 BƯỚC (SYNERGISTIC WORKFLOW)

Khi tạo màn hình mới, refactor component hoặc tinh chỉnh giao diện, Agent cần thực hiện theo chu trình sau:

```
[BƯỚC 1: TRA CỨU TIÊU CHUẨN] (ui-ux-pro-max)
     │   • Tra cứu catalog & guidelines (style, chart, color, react-native)
     ▼
[BƯỚC 2: TRIỂN KHAI CODE] (Minimalist Modern + Expo Best Practices)
     │   • Áp dụng token từ DESIGN.md & ThemeProvider (src/lib/theme-context.tsx)
     │   • Tuân thủ PRODUCT.md, giữ nguyên luồng MQTT, REST API, ML logic
     ▼
[BƯỚC 3: ĐÁNH GIÁ TRẢI NGHIỆM] (impeccable critique)
     │   • Chạy critique để rà soát phân cấp thị giác, mật độ thông tin
     ▼
[BƯỚC 4: AUDIT KỸ THUẬT & POLISH] (impeccable audit & polish)
         • Kiểm tra a11y, dark/light contrast, touch targets ≥ 44px
         • Chạy `impeccable detect` để loại bỏ hoàn toàn anti-patterns
```

### Bước 1: Tra cứu chuẩn từ `ui-ux-pro-max`
Trước khi viết code UI, chạy script tra cứu nội bộ:
```bash
# Tra cứu hướng dẫn hiệu năng và component cho React Native:
node .agents/skills/ui-ux-pro-max/scripts/search.js "list performance" --stack react-native
node .agents/skills/ui-ux-pro-max/scripts/search.js "dark mode contrast" --domain ux

# Tra cứu gợi ý phong cách Dashboard và biểu đồ:
node .agents/skills/ui-ux-pro-max/scripts/search.js "dashboard" --domain style
node .agents/skills/ui-ux-pro-max/scripts/search.js "time series line" --domain chart
```

### Bước 2: Triển khai theo tiêu chuẩn Minimalist Modern
- Sử dụng hook `useTheme()` từ `app/src/lib/theme-context.tsx` cho mọi màn hình/component.
- Sử dụng các token đã quy định trong [`DESIGN.md`](./DESIGN.md) và `app/src/constants/ui.ts`.
- **Hạn chế icon:** Không dùng icon trang trí bừa bãi; ưu tiên nhãn chữ rõ ràng (Voltage, Current, Power, Energy, Power Factor).
- **Tuyệt đối bảo toàn logic:** Không sửa đổi topic MQTT, backend API contract, thuật toán ML hay dữ liệu cảm biến PZEM-004T.

### Bước 3: Đánh giá UX với `impeccable`
Thực hiện đánh giá heuristic:
- Gõ `/impeccable critique [màn hình]` để kiểm tra tính dễ đọc, phân cấp dữ liệu và trải nghiệm người dùng.

### Bước 4: Kiểm tra kỹ thuật & Polish
- Chạy `/impeccable audit [màn hình]` để kiểm tra khả năng tiếp cận (Accessibility), kích thước touch target, an toàn safe-area, độ tương thích mobile/desktop.
- Chạy `/impeccable polish [màn hình]` để rà soát khoảng cách (spacing), căn lề (alignment), nhịp điệu thị giác.
- Chạy detector tự động trong terminal để xác minh:
```cmd
.agents\skills\impeccable\scripts\impeccable.cmd detect app/src/
```

---

## 3. QUY TẮC CỐT LÕI CỦA ỨNG DỤNG (PROJECT INVARIANTS)

1. **Phong cách thiết kế:** Minimalist Modern IoT Dashboard (lấy cảm hứng từ Apple & Linear; thanh lịch, sạch sẽ, tập trung dữ liệu, không gradient/neon sặc sỡ).
2. **Hỗ trợ Theme toàn diện:** Bắt buộc hỗ trợ 3 chế độ: `light`, `dark`, và `system`. Không bao giờ hardcode màu tĩnh (hex) trực tiếp trong StyleSheet mà không thông qua bảng màu theme.
3. **Responsive đa nền tảng:** Giao diện phải hiển thị cân đối trên:
   - Web Desktop (giới hạn `maxWidth: 1200`, căn giữa, bố cục lưới đa cột).
   - Web Mobile, Android & iOS (bố cục 1 cột, scroll mượt mà, hỗ trợ safe area).
4. **Bảo toàn chức năng IoT & ML:**
   - Dữ liệu realtime từ MQTT: Điện áp (V), Dòng điện (A), Công suất (W), Hệ số công suất (PF), Điện năng (kWh), Tần số (Hz).
   - Điều khiển rơ-le an toàn: Luôn có phản hồi trạng thái xác nhận hai chiều.
   - Mô hình ML: Giữ nguyên các endpoint dự báo phụ tải ngắn hạn (24h) và dài hạn (theo tháng).

---

## 4. QUY CHUẨN EXPO & REACT NATIVE (Trong thư mục `app/`)

1. **Cài đặt thư viện:**
   - **BẮT BUỘC** dùng `npx expo install <package>` thay vì `npm install` để tránh xung đột phiên bản SDK.
2. **Kiểm tra chất lượng code trước khi hoàn thành task:**
   ```bash
   npx tsc --noEmit     # Bắt buộc: Kiểm tra lỗi TypeScript
   npx expo lint        # Bắt buộc: Kiểm tra linting
   ```
3. **Điều hướng (Navigation):**
   - Sử dụng **Expo Router**. Tất cả route nằm trong `src/app/`.
   - Các component dùng chung, hooks, lib đặt ngoài `src/app/` (`src/components/`, `src/lib/`, `src/hooks/`).
4. **Native Code:**
   - Thư mục `ios/` và `android/` là mã sinh tự động (Continuous Native Generation). Không sửa file native trực tiếp bằng tay; cấu hình thông qua `app.json` và plugins.

