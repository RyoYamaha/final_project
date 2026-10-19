import { api } from '@/lib/api'
import type {
  ContentDetailData,
  ContentPaginationResponse,
  Genre,
  PopularPublisher,
  PopularTag,
  QueryContentParams,
  RankedContentPaginationResponse,
  RankingContentParams,
  Tag,
} from '@/types/content'
import type { ChapterContent, ChapterPage } from '@/types/chapter'

export const contentService = {
  getAll: (params?: QueryContentParams) =>
    api.get<ContentPaginationResponse>('/content', { params }),
  getRankings: (params: RankingContentParams) =>
    api.get<RankedContentPaginationResponse>('/content/rankings', { params }),
  getDetail: (id: string) => api.get<ContentDetailData>(`/content/${id}`),
  getGenres: () => api.get<Genre[]>('/content/genres'),
  getTags: (sort: 'name' | 'popular' = 'name') =>
    api.get<Array<Tag | PopularTag>>('/content/tags', { params: { sort } }),
  getPublishers: (sort: 'name' | 'popular' = 'name') =>
    api.get<PopularPublisher[]>('/content/publishers', { params: { sort } }),
  getMangaChapterPages: (chapterId: string) => api.get<ChapterPage[]>(`/manga/chapters/${chapterId}/pages`),
  getNovelChapterText: (chapterId: string) => api.get<ChapterContent>(`/novel/chapters/${chapterId}/text`),
}

