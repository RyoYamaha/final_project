// ==========================================
// 1. TRẠNG THÁI KIỂM DUYỆT (STATUS)
// ==========================================

export type ChapterModerationStatus = 'Published' | 'PendingReview' | 'Hidden'

// ==========================================
// 2. TRANG ẢNH CHAPTER (DÙNG CHO MANGA / PDF)
// ==========================================

export interface ChapterPage {
  id: string
  chapterId: string
  pageNumber: number // Số thứ tự trang: 1, 2, 3...
  imageUrl: string   // Link ảnh trên Cloudinary
}

// ==========================================
// 3. NỘI DUNG VĂN BẢN (DÙNG CHO NOVEL)
// ==========================================

export interface ChapterContent {
  id: string
  chapterId: string
  textBody: string   // Toàn bộ nội dung chữ của chương
}

// ==========================================
// 4. THÔNG TIN CƠ BẢN CỦA CHAPTER
// ==========================================

export interface Chapter {
  id: string
  contentId: string
  number: number     // Chương số mấy: 1, 2, 3...
  title?: string | null // Tên chương (ví dụ: "Chương 1: Lời mở đầu")
  moderationStatus: ChapterModerationStatus
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

// ==========================================
// 5. CHI TIẾT ĐẦY ĐỦ ĐỂ ĐỌC TRUYỆN (READER VIEW)
// ==========================================

export interface ChapterDetail extends Chapter {
  // Nếu là Manga -> có danh sách các trang ảnh
  pages?: ChapterPage[]

  // Nếu là Novel -> có nội dung chữ textBody
  chapterContent?: ChapterContent | null

  // Thông tin tóm tắt của bộ truyện chứa chapter này
  content?: {
    id: string
    title: string
    type: 'Manga' | 'Novel'
  }
}

// ==========================================
// 6. KHUÔN MẪU DỮ LIỆU TẠO CHAPTER MỚI (DTO)
// ==========================================

export interface CreateChapterDto {
  number: number
  title?: string
}
