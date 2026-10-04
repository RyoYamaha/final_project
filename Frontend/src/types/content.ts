import type { Chapter } from "./chapter";

// ==========================================
// 1. CÁC HẰNG SỐ (ENUM / UNION TYPE)
// ==========================================

export type ContentType = "Manga" | "Novel";

export type OwnershipTier = "Licensed" | "FanTranslation" | "Original";

export type PublicationStatus =
  "Draft" | "PendingApproval" | "Published" | "Rejected" | "Hidden";

export type StoryStatus = "Ongoing" | "Completed" | "Hiatus";

// ==========================================
// 2. THỂ LOẠI VÀ THẺ (GENRE & TAG)
// ==========================================

export interface Genre {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
}

// ==========================================
// 3. TRUYỆN (CONTENT)
// ==========================================

// Dạng cơ bản hiển thị ở danh sách ngoài trang chủ / tìm kiếm
export interface ContentListItem {
  id: string;
  title: string;
  synopsis?: string | null;
  type: ContentType;
  ownershipTier: OwnershipTier;
  publicationStatus: PublicationStatus;
  storyStatus: StoryStatus;
  coverImageUrl?: string | null;
  uploaderId: string;
  publisherId?: string | null;
  parentContentId?: string | null;
  createdAt: string;
  updatedAt: string;
  genres: { genre: Genre }[];
  tags: { tag: Tag }[];
  uploader: {
    id: string;
    username: string;
  };
}

// Dạng chi tiết khi người dùng bấm vào trang xem thông tin truyện
export interface ContentDetailData extends ContentListItem {
  chapters: Chapter[];
  parentContent?: {
    id: string;
    title: string;
  } | null;
  publisher?: {
    id: string;
    organizationName: string;
  } | null;
}

// ==========================================
// 4. QUERY LỌC VÀ KẾT QUẢ PHÂN TRANG (API)
// ==========================================

export interface QueryContentParams {
  page?: number;
  limit?: number;
  type?: ContentType;
  ownershipTier?: OwnershipTier;
  publicationStatus?: PublicationStatus;
  search?: string;
  genreId?: string;
}

export interface ContentPaginationResponse {
  items: ContentListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
