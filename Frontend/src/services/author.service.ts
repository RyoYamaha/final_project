import { api } from '@/lib/api'
import type { ContentListItem } from '@/types/content'
import type { AuthorDashboardStats, CreateContentDto, CreateTranslationDto, UpdateContentDto } from '@/types/author'

export const authorService = {
  createOriginal: async (dto: CreateContentDto) =>
    (await api.post<ContentListItem>('/author/original-content', dto)).data,

  createTranslation: async (dto: CreateTranslationDto) =>
    (await api.post<ContentListItem>('/author/translations', dto)).data,

  uploadCover: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return (await api.post<{ url: string }>('/author/upload-cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data
  },

  getMyTranslations: async () => (await api.get<ContentListItem[]>('/author/translations')).data,
  
  getMyContents: async () => (await api.get<ContentListItem[]>('/author/content')).data,

  browseLicensed: async (search?: string) =>
    (await api.get<ContentListItem[]>('/author/browse-licensed', { params: { search } })).data,

  resubmitTranslation: async (id: string) =>
    (await api.post(`/author/translations/${id}/resubmit`)).data,

  updateContent: async (id: string, dto: UpdateContentDto) =>
    (await api.patch<ContentListItem>(`/author/content/${id}`, dto)).data,

  getDashboard: async () => (await api.get<AuthorDashboardStats>('/author/dashboard')).data,
}
