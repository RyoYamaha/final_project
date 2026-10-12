import { api } from '@/lib/api'
import type { Publisher, RegisterPublisherDto } from '@/types/publisher'
import type { ContentDetailData, ContentListItem } from '@/types/content'
import type { CreateContentDto, UpdateContentDto } from '@/types/author'

export const publisherService = {
  getMe: () => api.get<Publisher>('/publisher/me'),
  register: (data: RegisterPublisherDto) => api.post<Publisher>('/publisher/register', data),
  getMyContents: () => api.get<ContentListItem[]>('/publisher/content'),
  getContentDetail: (id: string) => api.get<ContentDetailData>(`/publisher/content/${id}`),
  resubmitContent: (id: string) => api.post(`/publisher/content/${id}/resubmit`),

  createOriginal: async (dto: CreateContentDto) =>
    (await api.post<ContentListItem>('/publisher/content', dto)).data,

  uploadCover: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return (await api.post<{ url: string }>('/publisher/upload-cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data
  },

  updateContent: async (id: string, dto: UpdateContentDto) =>
    (await api.patch<ContentListItem>(`/publisher/content/${id}`, dto)).data,
}
