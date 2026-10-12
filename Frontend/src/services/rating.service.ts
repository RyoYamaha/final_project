import { api } from '@/lib/api'
import type { MyRating, RatingSummary } from '@/types/library'

export const ratingService = {
  getSummary: (contentId: string) => api.get<RatingSummary>(`/rating/${contentId}/summary`),
  getMine: (contentId: string) => api.get<MyRating | null>(`/rating/${contentId}`),
  rate: (contentId: string, score: number) => api.post('/rating', { contentId, score }),
  clear: (contentId: string) => api.delete(`/rating/${contentId}`),
}
