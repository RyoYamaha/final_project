# Phân tích Wireframe & Tiến độ Frontend

Chào bạn, tôi đã phân tích tài liệu PDF wireframe của bạn và đối chiếu với bản Frontend hiện tại. Dưới đây là danh sách những điểm còn thiếu/lệch so với thiết kế, và những phần tôi đã bổ sung ngay lập tức.

## 1. Cấu trúc Sidebar & Điều hướng (ĐÃ SỬA)
**Trong Wireframe:**
- Menu có đánh số thứ tự rõ ràng (vd: `1. Registration & Verification`, `2. Dashboard Analytics`, v.v.).
- Layout cho **Author**, **Publisher**, và **Admin** đều có các mục tương đương nhau về form và tên gọi.

**Hành động của tôi:**
- Đã sửa lại `AuthorLayout`, `PublisherLayout`, và `AdminLayout` để hiển thị chính xác tên và số thứ tự menu theo sát wireframe.

## 2. Dashboard Publisher - Biểu đồ (ĐÃ SỬA)
**Trong Wireframe:**
- Dashboard của Publisher (trang 3) có biểu đồ "Readership Trends Over Time" và "Top Performing Titles" chi tiết.

**Hành động của tôi:**
- Đã tích hợp thư viện `recharts` vào `Dashboard.tsx` của Publisher.
- Vẽ ngay 2 biểu đồ (Line chart cho Trends và Bar chart cho Top Titles) sử dụng dữ liệu giả lập (mock data) để màn hình trông chuyên nghiệp và đúng với wireframe nhất.

## 3. Màn hình Quản lý Nội dung cho Admin (ĐÃ THÊM MỚI)
**Trong Wireframe:**
- Admin có trang "Content Management" (Trang 9) hiển thị toàn bộ nội dung (truyện) trên hệ thống với các bộ lọc và hành động chi tiết.

**Hành động của tôi:**
- Đã tạo file mới `ContentManagement.tsx`.
- Gắn api `GET /admin/content` (vừa làm ở bước trước) vào trang này để hiển thị bảng danh sách nội dung.
- Đã thêm route `/admin/content` vào `router.tsx` và sidebar của Admin.

---

## Các tính năng còn thiếu cần làm tiếp (Chờ xác nhận của bạn)

Do số lượng tính năng trong wireframe khá đồ sộ, dưới đây là những phần tôi sẽ làm tiếp nếu bạn đồng ý (tạm bỏ qua AI theo yêu cầu):

### A. Khu vực Upload (Author/Publisher)
1. **Upload Novel Wizard (Trang 6):** Wireframe mô tả Upload Novel gồm 3 bước (Wizard): `Upload PDF -> Novel Info -> Review`. Code hiện tại là một form dài duy nhất. Cần tách ra thành luồng 3 bước.
2. **Copyright Information (Trang 2):** Form khai báo bản quyền chi tiết khi đăng truyện.
3. **Resubmit Series (Trang 4):** Giao diện gửi lại truyện kèm lý do/feedback từ admin chưa được hoàn thiện phần hiển thị hộp text feedback.

### B. Khu vực Admin (Review Queue Details)
- **Review Queue Chi tiết (Trang 9/10):** Hiện tại `ReviewQueue.tsx` chỉ có nút bấm Approve/Reject ngoài bảng. Wireframe yêu cầu một trang chi tiết (khi click vào truyện) hiển thị Cover, Info, Synopsis, Copyright info, File nội dung, rồi mới có nút Accept/Reject kèm ô nhập lý do. Tôi có thể xây dựng riêng màn hình này thành route `/admin/review-queue/:id`.

### C. Giao diện Đọc & Trang chủ (User)
- **Home (Trang 1):** Cần bổ sung thêm block "Continue Reading" (lịch sử đọc).
- **Read Novel (Trang 1):** Thêm Sidebar cài đặt cỡ chữ, font chữ, màu nền lúc đọc tiểu thuyết.

Bạn hãy xem biểu đồ mới ở Dashboard Publisher và trang Quản lý Nội dung (Content) ở Admin. Nếu bạn muốn tôi ưu tiên làm phần nào tiếp theo trong danh sách trên (ví dụ: làm màn hình Review Details cho Admin hoặc làm Luồng 3 bước Upload Novel), hãy báo tôi nhé!
