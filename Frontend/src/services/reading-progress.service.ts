import { isAxiosError } from 'axios'
import { api } from '@/lib/api'

interface ReadingProgressResponse {
  lastChapterId: string
  chapterReads: Array<{ chapterId: string }>
}

interface UpdateReadingProgressDto {
  chapterId: string
  lastPageNumber?: number
}

export interface ReadingHistoryItem {
  contentId: string
  lastReadAt: string
  content: {
    id: string
    title: string
    type: 'Manga' | 'Novel'
    coverImageUrl?: string | null
  }
  lastChapter: {
    id: string
    number: number
    title?: string | null
  }
}

export const readingProgressService = {
  getMyHistory: () => api.get<ReadingHistoryItem[]>('/reading-progress'),

  getCompletedChapterIds: async (contentId: string): Promise<string[]> => {
    try {
      const { data } = await api.get<ReadingProgressResponse>(`/reading-progress/${contentId}`)
      return data.chapterReads.map(({ chapterId }) => chapterId)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return []
      throw error
    }
  },

  completeChapter: (contentId: string, dto: UpdateReadingProgressDto) =>
    api.put(`/reading-progress/${contentId}`, dto),
}
