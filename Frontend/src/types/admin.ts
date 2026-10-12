import type { ContentListItem, ContentType } from './content'
import type { Publisher } from './publisher'
import type { ChapterContent, ChapterModerationStatus, ChapterPage } from './chapter'

export type PendingContent = Pick<
  ContentListItem,
  'id' | 'title' | 'synopsis' | 'type' | 'ownershipTier' | 'coverImageUrl' | 'createdAt' | 'uploader'
>

export interface PendingPublisher extends Publisher {
  // GIẢ ĐỊNH theo JSON mẫu, chưa khớp schema đã biết
  contactEmail?: string | null
  websiteUrl?: string | null
  taxId?: string | null
  createdAt?: string
  user?: { id: string; username: string; email: string }
}

export interface AdminChapterDetail {
  id: string
  contentId: string
  number: number
  title: string | null
  moderationStatus: ChapterModerationStatus
  content: {
    id: string
    title: string
    type: ContentType
    publicationStatus: string
  }
  chapterContent: ChapterContent | null
  pages: ChapterPage[]
}

export interface ReviewQueue {
  pendingContent: PendingContent[]
  pendingPublisher: PendingPublisher[]
}
