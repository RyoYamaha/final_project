import type { ContentListItem } from './content'

export interface LibraryEntry {
  id: string
  userId: string
  contentId: string
  createdAt: string
  content: Pick<ContentListItem, 'id' | 'title' | 'coverImageUrl' | 'type' | 'storyStatus'>
}

export interface RatingSummary {
  averageScore: number
  totalRatings: number
}

export interface MyRating {
  id: string
  userId: string
  contentId: string
  score: number
}
