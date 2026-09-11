# NovaManga - Project Context

Tài liệu này mô tả trạng thái code hiện tại để người khác hoặc AI có thể hiểu nhanh dự án đang có gì, phần nào đã làm và phần nào cần tiếp tục.

## 1. Mục tiêu dự án

NovaManga là nền tảng đọc và đăng tải Manga/Novel. Hệ thống dự kiến hỗ trợ:

- Người đọc đăng ký, đăng nhập, đọc truyện, theo dõi tiến độ và tương tác.
- Author tạo bản dịch fan translation dựa trên nội dung licensed.
- Publisher đăng tải nội dung licensed.
- Admin duyệt, từ chối, ẩn hoặc khôi phục nội dung.
- Nội dung Manga có các trang ảnh; nội dung Novel có text và có thể nhập từ PDF.
- Dữ liệu text chapter có thể được dùng làm knowledge base hoặc cho trợ lý AI sau này.

## 2. Cấu trúc thư mục hiện tại

```text
SourceCode/
├── PROJECT_CONTEXT.md             # Tài liệu này
├── Backend/                        # NestJS API + Prisma
│   ├── app.module.ts              # Root module, nơi nối các module
│   ├── package.json               # Dependencies và scripts
│   ├── prisma.config.ts           # Cấu hình Prisma CLI
│   ├── tsconfig.json
│   ├── common/
│   │   ├── constants/             # Role, content type/status
│   │   ├── decorators/            # CurrentUser, Roles
│   │   ├── filter/                # HTTP exception filter
│   │   ├── guards/                # JWT guard và role guard
│   │   └── cloudinary/             # Upload ảnh lên Cloudinary
│   ├── core/
│   │   ├── content/               # Content listing, detail, moderation
│   │   └── chapter/               # Tạo chapter, kiểm tra ownership, moderation
│   ├── user/auth/                 # Register, login, refresh, logout, JWT strategy
│   ├── publisher/                 # Publisher profile và licensed content
│   ├── author/                    # Fan translation và author dashboard
│   ├── manga/                     # Tạo chapter và upload page ảnh
│   ├── novel/                     # Tạo chapter, text/PDF, lấy nội dung
│   ├── admin/                     # Hiện mới có thư mục, chưa thấy implementation
│   ├── ai_assistant/              # Hiện mới có thư mục, chưa thấy implementation
│   ├── recommendation/           # Hiện mới có thư mục, chưa thấy implementation
│   ├── report/                    # Hiện mới có thư mục, chưa thấy implementation
│   ├── search/                    # Hiện mới có thư mục, chưa thấy implementation
│   ├── jobs/                      # Hiện mới có thư mục, chưa thấy implementation
│   ├── prisma/
│   │   ├── schema.prisma          # Mô hình dữ liệu chính
│   │   ├── prisma.service.ts      # Prisma 7 + SQL Server adapter
│   │   └── migrations/            # Migration database hiện có
│   └── generated/prisma/          # Code Prisma generated, không sửa thủ công
└── Frontend/                      # Hiện chưa có file code được phát hiện
```

## 3. Công nghệ và cách chạy dự kiến

- Backend: NestJS 12, TypeScript, Prisma 7.
- Database: Microsoft SQL Server thông qua `@prisma/adapter-mssql`.
- Authentication: JWT access token, refresh token lưu dưới dạng SHA-256 hash, bcrypt password.
- File/image: Cloudinary module; Manga upload nhiều ảnh.
- PDF: `pdf-to-png-converter` và code đang gọi `pdf-parse`.
- Biến môi trường quan trọng: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES` và cấu hình Cloudinary.
- `Backend/package.json` hiện chỉ có script test giả lập; chưa có script start/build rõ ràng.

## 4. Những phần đã có code xử lý

### Authentication

File chính: `Backend/user/auth/`

- `POST /auth/register`: tạo User mới, luôn gán role `Reader`.
- `POST /auth/login`: đăng nhập bằng username hoặc email.
- `POST /auth/refresh`: rotate refresh token cũ và phát token mới.
- `POST /auth/logout`: revoke refresh token.
- Có `JwtStrategy`, `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()` và `@Roles()`.

Lưu ý: `AuthModule` đã tồn tại nhưng hiện chưa được import vào `Backend/app.module.ts`, nên auth chưa chắc đã được expose khi khởi động app.

### Content

File chính: `Backend/core/content/`

- `GET /content`: danh sách có phân trang, tìm theo title, lọc theo type, ownership tier, publication status, genre.
- `GET /content/:id`: lấy chi tiết content, genre, tag, chapter, uploader, publisher và parent content.
- Admin moderation:
  - `PATCH /content/:id/approve`
  - `PATCH /content/:id/reject`
  - `PATCH /content/:id/hide`
  - `PATCH /content/:id/restore`
- Content mới được tạo với trạng thái `PendingApproval`.
- Fan Translation bắt buộc trỏ tới một Content gốc có `ownershipTier = Licensed`.

### Publisher

File chính: `Backend/publisher/`

- `POST /publisher/register`: đăng ký publisher profile.
- `GET /publisher/me`: lấy publisher profile hiện tại.
- `POST /publisher/content`: tạo licensed content.
- `GET /publisher/content`: lấy content của publisher hiện tại.
- `POST /publisher/content/:id/resubmit`: gửi lại content bị reject.
- Toàn bộ route yêu cầu JWT.

### Author và fan translation

File chính: `Backend/author/`

- `GET /author/browse-licensed`: tìm content licensed để dịch.
- `POST /author/translations`: tạo fan translation.
- `GET /author/translations`: lấy các bản dịch của author hiện tại.
- `POST /author/translations/:id/resubmit`: gửi lại bản dịch bị reject.
- `GET /author/dashboard`: lấy thống kê dashboard author.
- Toàn bộ route yêu cầu JWT.

### Chapter và Manga

File chính: `Backend/core/chapter/` và `Backend/manga/`

- Author/Publisher có thể tạo chapter cho content của chính mình.
- Không cho phép trùng số chapter trong cùng một content.
- `POST /manga/content/:contentId/chapters`: tạo khung chapter.
- `POST /manga/chapters/:chapterId/pages`: upload tối đa 200 ảnh, lưu vào Cloudinary và database.
- `GET /manga/chapters/:chapterId/pages`: lấy danh sách ảnh theo thứ tự trang.
- Có kiểm tra ownership trước khi sửa chapter hoặc upload page.

### Novel

File chính: `Backend/novel/`

- `POST /novel/content/:contentId/chapters`: tạo chapter.
- `POST /novel/chapters/:chapterId/text`: tạo hoặc cập nhật text chapter.
- `POST /novel/chapters/:chapterId/pdf`: đọc PDF, trích xuất text, chuyển PDF thành ảnh PNG và upload lên Cloudinary.
- `GET /novel/chapters/:chapterId/pages`: lấy ảnh của chapter.
- `GET /novel/chapters/:chapterId/text`: lấy text chapter.
- Có hàm nội bộ `getChapterTextForAI()` để lấy text cho AI.

## 5. Mô hình dữ liệu đã thiết kế

Các nhóm model chính trong `Backend/prisma/schema.prisma`:

- Nội dung: `Content`, `MangaDetail`, `NovelDetail`, `Chapter`, `ChapterPage`, `ChapterContent`.
- Phân loại: `Genre`, `Tag`, `ContentGenre`, `ContentTag`.
- Người dùng và quyền: `User`, `Publisher`, `RefreshToken`.
- Tương tác đọc: `Bookmark`, `Favorite`, `Rating`, `Comment`, `ReadingProgress`, `Notification`.
- Kiểm duyệt: `Report`.
- AI/recommendation: `ContentKnowledgeBase`, `AIConversation`, `RecommendationCache`.

Các enum nghiệp vụ hiện đang lưu bằng `String` vì SQL Server không dùng Prisma enum trong thiết kế này. Giá trị hợp lệ được ghi chú trong schema và một phần được kiểm tra ở DTO/service.

## 6. Trạng thái hiện tại và phần còn thiếu

### Đã có nền tảng

- Schema database và một migration init.
- Prisma service kết nối SQL Server bằng adapter.
- Content, Publisher, Author, Manga, Novel có module/controller/service cơ bản.
- Có phân quyền JWT/role và kiểm tra ownership ở các luồng upload/chapter.
- Có upload Cloudinary và xử lý PDF cho Novel.

### Chưa hoàn thiện hoặc cần kiểm tra

- `Frontend/` chưa có source code; cần xây dựng giao diện và gọi API.
- `AuthModule`, `MangaModule`, `NovelModule` chưa thấy được import vào `AppModule`.
- Các thư mục `admin`, `ai_assistant`, `recommendation`, `report`, `search`, `jobs` chưa có implementation được phát hiện.
- Chưa thấy `main.ts`, bootstrap NestJS, global `ValidationPipe`, CORS hoặc HTTP exception filter được đăng ký.
- `package.json` đang thiếu script build/start/test thực tế.
- Code Novel đang `require('pdf-parse')` nhưng dependency này chưa xuất hiện trong `package.json`; cần bổ sung hoặc thay thế trước khi build.
- Chưa có test tự động cho auth, moderation, ownership, upload ảnh và PDF.
- Cần xác minh các module đã được nối đầy đủ trước khi gọi API từ frontend.

## 7. Thứ tự ưu tiên đề xuất cho AI tiếp tục phát triển

1. Hoàn thiện bootstrap NestJS và import các module còn thiếu vào `AppModule`.
2. Bổ sung dependencies/scripts/env example và chạy build/typecheck.
3. Hoàn thiện auth và kiểm tra JWT end-to-end.
4. Hoàn thiện API reader: chapter detail, bookmark, favorite, rating, comment, reading progress.
5. Hoàn thiện admin: user/content/chapter moderation và report handling.
6. Hoàn thiện search, recommendation và AI assistant dựa trên `ContentKnowledgeBase`.
7. Xây dựng Frontend theo các role Reader, Author, Publisher và Admin.
8. Viết test cho từng workflow trước khi mở rộng tính năng.

## 8. Prompt ngữ cảnh gợi ý cho AI

> Đây là dự án NovaManga trong thư mục `SourceCode`. Backend dùng NestJS + TypeScript + Prisma 7 + SQL Server. Schema nằm ở `Backend/prisma/schema.prisma`. Các luồng đã có code gồm auth cơ bản, content listing/detail/moderation, publisher, author fan translation, Manga image upload và Novel text/PDF. Frontend hiện chưa triển khai. Trước khi sửa code, hãy đọc `PROJECT_CONTEXT.md`, kiểm tra module đã được import vào `AppModule`, giữ đúng role/ownership/status hiện có và không giả định những thư mục rỗng là tính năng đã hoàn thành. Khi thêm tính năng, cập nhật cả controller, service, DTO, module, schema/migration nếu cần và viết test cho workflow đó.
