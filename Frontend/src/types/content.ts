import type { Chapter } from "./chapter";

// ==========================================
// 1. CÁC HẰNG SỐ (ENUM / UNION TYPE)
// ==========================================

export type ContentType = "Manga" | "Novel";

export type OwnershipTier = "Licensed" | "FanTranslation" | "Original";

export type ContentPricingType = "free" | "paid";

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
  reviewFeedback?: string | null;
  storyStatus: StoryStatus;
  coverImageUrl?: string | null;
  pricingType: ContentPricingType;
  priceCoins: number;
  freeChapters: number;
  allowCommunityTranslation: boolean;
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
  tagId?: string;
}

export type RankingCategory = "ongoing" | "popular-manga" | "popular-novel";

export interface RankingContentParams {
  category: RankingCategory;
  page?: number;
  limit?: number;
}

export interface RankedContentListItem extends ContentListItem {
  activeReaders: number;
}

export interface RankedContentPaginationResponse {
  items: RankedContentListItem[];
  meta: ContentPaginationResponse["meta"];
  popularityWindowDays: number;
}

export interface RecommendedContentListItem extends RankedContentListItem {
  matchingGenres: number;
  averageRating: number;
}

export interface RecommendedContentPaginationResponse {
  items: RecommendedContentListItem[];
  meta: ContentPaginationResponse["meta"];
  fallback: boolean;
}

export interface PopularTag extends Tag {
  activeReads: number;
}

export interface PopularPublisher {
  id: string;
  organizationName: string;
  activeReads: number;
  publishedContentCount: number;
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

// ==========================================
// 5. CÁC DTO TẠO & SỬA TRUYỆN DÀNH CHO AUTHOR
// ==========================================

export interface CreateOriginalContentDto {
  title: string;
  synopsis?: string;
  type: ContentType;
  coverImageUrl?: string;
  genreIds?: string[];
  tagIds?: string[];
}

export interface CreateFanTranslationDto extends CreateOriginalContentDto {
  parentContentId: string;
}

export interface UpdateContentDto {
  title?: string;
  synopsis?: string;
  coverImageUrl?: string;
  storyStatus?: StoryStatus;
  genreIds?: string[];
  tagIds?: string[];
}

export interface LicensedBrowseItem {
  id: string;
  title: string;
  type: ContentType;
  coverImageUrl?: string | null;
  synopsis?: string | null;
  pricingType: ContentPricingType;
  priceCoins: number;
  freeChapters: number;
  allowCommunityTranslation: boolean;
}

export interface AuthorDashboardStats {
  totalContents: number;
  totalTranslations: number;
  totalOriginals: number;
  bookmarkCount: number;
  averageRating: number;
  ratingCount: number;
  commentCount: number;
  translations?: Array<{ id: string; title: string; publicationStatus: string }>;
  contents?: Array<{
    id: string;
    title: string;
    type: ContentType;
    ownershipTier: OwnershipTier;
    publicationStatus: PublicationStatus;
  }>;
}
