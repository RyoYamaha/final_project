import { api } from '@/lib/api'
import type {
  ContentDetailData,
  ContentPaginationResponse,
  Genre,
  PopularPublisher,
  PopularTag,
  QueryContentParams,
  RankedContentPaginationResponse,
  RecommendedContentPaginationResponse,
  RankingContentParams,
  Tag,
} from '@/types/content'
import type { ChapterContent, ChapterPage } from '@/types/chapter'

export const contentService = {
  getAll: (params?: QueryContentParams) =>
    api.get<ContentPaginationResponse>('/content', { params }),
  getRankings: (params: RankingContentParams) =>
    api.get<RankedContentPaginationResponse>('/content/rankings', { params }),
  getRecommendations: (params?: Pick<RankingContentParams, 'page' | 'limit'>) =>
    api.get<RecommendedContentPaginationResponse>('/content/recommendations', { params }),
  getDetail: (id: string) => api.get<ContentDetailData>(`/content/${id}`),
  getGenres: () => api.get<Genre[]>('/content/genres'),
  getTags: (sort: 'name' | 'popular' = 'name') =>
    api.get<Array<Tag | PopularTag>>('/content/tags', { params: { sort } }),
  getPublishers: (sort: 'name' | 'popular' = 'name') =>
    api.get<PopularPublisher[]>('/content/publishers', { params: { sort } }),
  getMangaChapterPages: (chapterId: string) => api.get<ChapterPage[]>(`/manga/chapters/${chapterId}/pages`),
  getNovelChapterPages: (chapterId: string) => api.get<ChapterPage[]>(`/novel/chapters/${chapterId}/pages`),
  getNovelChapterText: (chapterId: string) => api.get<ChapterContent>(`/novel/chapters/${chapterId}/text`),
}

