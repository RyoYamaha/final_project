import type { ContentType } from './content'

export interface CreateContentDto {
  title: string
  type: ContentType
  synopsis?: string
  coverImageUrl?: string
}

export interface UpdateContentDto {
  title?: string
  synopsis?: string
  coverImageUrl?: string
  storyStatus?: string
  genreIds?: string[]
  tagIds?: string[]
}


export interface CreateTranslationDto extends CreateContentDto {
  parentContentId: string
}

export interface AuthorDashboardStats {
  totalTranslations: number
  bookmarkCount: number
  averageRating: number | null
  ratingCount: number
  commentCount: number
}

export interface CreateChapterDto {
  number: number
  title?: string
}
