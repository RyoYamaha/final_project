# API Testing Checklist

**Base URL:** `http://localhost:3000`

## Setup
- [ ] Backend server đang chạy (`npm run start:dev`)
- [ ] SQL Server container đang chạy (`docker-compose up -d`)
- [ ] Đã đăng ký user test
- [ ] Đã login và lưu `accessToken`

---

## 1. Auth Service
**Không cần token**

- [ ] POST `/auth/register` - Đăng ký user mới
- [ ] POST `/auth/login` - Login lấy token
- [ ] POST `/auth/refresh` - Refresh token
- [ ] POST `/auth/logout` - Logout

**Test Data:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

---

## 2. Content Service
**Public - không cần token**

- [ ] GET `/content` - Lấy danh sách content
- [ ] GET `/content/:id` - Lấy chi tiết content theo ID

---

## 3. Author Service
**Cần token + role Author**

**Đổi role trong SSMS:**
```sql
UPDATE dbo.[User] SET role = 'Author' WHERE username = 'testuser';
```

- [ ] GET `/author/browse-licensed` - Xem content licensed
- [ ] GET `/author/dashboard` - Xem thống kê dashboard
- [ ] POST `/author/original-content` - Tạo content gốc
- [ ] GET `/author/translations` - Xem bản dịch của mình
- [ ] POST `/author/translations` - Tạo bản dịch fan
- [ ] POST `/author/translations/:id/resubmit` - Gửi lại bản dịch

**Test Data - Create Original Content:**
```json
{
  "title": "Truyện Test 1",
  "description": "Mô tả truyện test",
  "type": "MANGA"
}
```
→ Lưu `contentId` trả về

---

## 4. Publisher Service
**Cần token + role Publisher**

**Đổi role trong SSMS:**
```sql
UPDATE dbo.[User] SET role = 'Publisher' WHERE username = 'testuser';
```

- [ ] POST `/publisher/register` - Đăng ký publisher
- [ ] GET `/publisher/me` - Xem profile publisher
- [ ] POST `/publisher/content` - Tạo content publisher
- [ ] GET `/publisher/content` - Xem content của mình
- [ ] POST `/publisher/content/:id/resubmit` - Gửi lại content

**Test Data - Register Publisher:**
```json
{
  "name": "Publisher Test",
  "description": "Test publisher"
}
```

**Test Data - Create Content:**
```json
{
  "title": "Truyện Publisher",
  "description": "Truyện từ publisher",
  "type": "Novel"
}
```
→ Lưu `contentId` trả về

---

## 5. Manga Service
**Cần token + role Author/Publisher**

- [ ] POST `/manga/content/:contentId/chapters` - Tạo chapter manga
- [ ] POST `/manga/chapters/:chapterId/pages` - Upload pages (multipart/form-data)
- [ ] GET `/manga/chapters/:chapterId/pages` - Lấy pages của chapter

**Test Data manga - Create Chapter:**
```json
{
  "title": "Chapter 1",
  "chapterNumber": 1
}
```
→ Lưu `chapterId` trả về

---

## 6. Novel Service
**Cần token + role Author/Publisher**

- [ ] POST `/novel/content/:contentId/chapters` - Tạo chapter novel
- [ ] POST `/novel/chapters/:chapterId/text` - Set text cho chapter
- [ ] POST `/novel/chapters/:chapterId/pdf` - Upload PDF cho chapter
- [ ] GET `/novel/chapters/:chapterId/pages` - Lấy pages
- [ ] GET `/novel/chapters/:chapterId/text` - Lấy text

**Test Data novel - Create Chapter:**
```json
{
  "title": "Chapter 1",
  "chapterNumber": 1
}
```

**Test Data novel - Set Text:**
```json
{
  "textBody": "Nội dung chapter..."
}
```

---

## 7. Bookmark Service
**Cần token**

- [ ] POST `/bookmarks` - Thêm bookmark
- [ ] GET `/bookmarks` - Lấy danh sách bookmark
- [ ] DELETE `/bookmarks/:contentId` - Xóa bookmark

**Test Data:**
```json
{
  "contentId": "<contentId_từ_bước_3_hoặc_4>"
}
```

---

## 8. Rating Service
**Cần token**

- [ ] POST `/rating` - Tạo/cập nhật rating
- [ ] GET `/rating/:contentId/summary` - Lấy thống kê rating
- [ ] GET `/rating/:contentId` - Lấy rating của mình
- [ ] DELETE `/rating/:contentId` - Xóa rating

**Test Data:**
```json
{
  "contentId": "<contentId>",
  "score": 5
}
```

---

## 9. Comment Service
**Public endpoints - không cần token:**
- [ ] GET `/comments/:contentId` - Lấy comments của content

**Authenticated endpoints - cần token:**
- [ ] POST `/comments` - Thêm comment
- [ ] DELETE `/comments/:commentId` - Xóa comment

**Test Data:**
```json
{
  "contentId": "<contentId>",
  "body": "Comment test",
  "parentCommentId": "<optional>"
}
```

---

## 10. Notification Service
**Cần token**

- [ ] GET `/notifications` - Lấy notifications
- [ ] GET `/notifications/unread-count` - Đếm unread
- [ ] PATCH `/notifications/read-all` - Đánh dấu tất cả đã đọc
- [ ] PATCH `/notifications/:id/read` - Đánh dấu đã đọc 1 notification

---

## 11. Report Service
**Cần token**

- [ ] POST `/reports` - Tạo report
- [ ] GET `/reports/me` - Lấy reports của mình

**Test Data:**
```json
{
  "contentId": "<contentId>",
  "reason": "Spam",
  "description": "Mô tả chi tiết"
}
```

---

## 12. Admin Report Service
**Cần token + role Admin**

**Đổi role trong SSMS:**
```sql
UPDATE dbo.[User] SET role = 'Admin' WHERE username = 'testuser';
```

- [ ] GET `/admin/reports` - Lấy tất cả reports (có filter status)
- [ ] GET `/admin/reports/:id` - Lấy chi tiết report
- [ ] PATCH `/admin/reports/:id/dismiss` - Bỏ qua report
- [ ] PATCH `/admin/reports/:id/resolve` - Giải quyết report

---

## 13. Content Admin Actions
**Cần token + role Admin**

- [ ] PATCH `/content/:id/approve` - Duyệt content
- [ ] PATCH `/content/:id/reject` - Từ chối content
- [ ] PATCH `/content/:id/hide` - Ẩn content
- [ ] PATCH `/content/:id/restore` - Khôi phục content

---

## Notes

- **Role hierarchy:** Reader < Author < Publisher < Admin
- **Mỗi lần đổi role trong SSMS, phải login lại để lấy token mới**
- **Content ID từ bước 3 hoặc 4 dùng cho các service sau (Bookmark, Rating, Comment, Report)**
- **Chapter ID từ bước 5 hoặc 6 dùng cho upload pages/text**
- **Test theo thứ tự: Auth → Author/Publisher (tạo content) → Manga/Novel (tạo chapter) → Bookmark/Rating/Comment/Notification/Report → Admin**
