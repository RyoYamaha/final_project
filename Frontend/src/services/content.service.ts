import { api } from '@/lib/api'
import type { ContentDetailData, ContentPaginationResponse, Genre, QueryContentParams, Tag } from '@/types/content'
import type { ChapterContent, ChapterPage } from '@/types/chapter'

export const contentService = {
  getAll: (params?: QueryContentParams) =>
    api.get<ContentPaginationResponse>('/content', { params }),
  getDetail: (id: string) => api.get<ContentDetailData>(`/content/${id}`),
  getGenres: () => api.get<Genre[]>('/content/genres'),
  getTags: () => api.get<Tag[]>('/content/tags'),
  getMangaChapterPages: (chapterId: string) => api.get<ChapterPage[]>(`/manga/chapters/${chapterId}/pages`),
  getNovelChapterText: (chapterId: string) => api.get<ChapterContent>(`/novel/chapters/${chapterId}/text`),
}


