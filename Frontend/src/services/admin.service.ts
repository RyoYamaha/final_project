import { api } from '@/lib/api'
import type { AdminChapterDetail, ReviewQueue } from '@/types/admin'
import type { ContentListItem } from '@/types/content'

export interface AdminUser {
  id: string
  username: string
  email: string
  role: 'Reader' | 'Author' | 'Publisher' | 'Admin'
  bio: string | null
  isLocked: boolean
  createdAt: string
}

export interface AdminUserInput {
  username: string
  email: string
  role: 'Reader' | 'Author' | 'Publisher'
  bio?: string
}

export const adminService = {
  getReviewQueue: async () => (await api.get<ReviewQueue>('/admin/review-queue')).data,
  getAllContents: async () => (await api.get<ContentListItem[]>('/admin/content')).data,
  getChapterDetail: async (id: string) => (await api.get<AdminChapterDetail>(`/admin/chapters/${id}`)).data,

  approveContent: (id: string) => api.patch(`/admin/content/${id}/approve`),
  rejectContent: (id: string, reason?: string) => api.patch(`/admin/content/${id}/reject`, { reason }),
  approveChapter: (id: string) => api.patch(`/admin/chapters/${id}/approve`),
  rejectChapter: (id: string) => api.patch(`/admin/chapters/${id}/reject`),
  hideContent: (id: string) => api.patch(`/admin/content/${id}/hide`),
  restoreContent: (id: string) => api.patch(`/admin/content/${id}/restore`),

  verifyPublisher: (id: string) => api.patch(`/admin/publishers/${id}/verify`),
  rejectPublisher: (id: string) => api.patch(`/admin/publishers/${id}/reject`),

  lockUser: (id: string) => api.patch(`/admin/users/${id}/lock`),
  unlockUser: (id: string) => api.patch(`/admin/users/${id}/unlock`),
  getUsers: async () => (await api.get<AdminUser[]>('/admin/users')).data,
  updateUser: (id: string, data: AdminUserInput) =>
    api.patch<AdminUser>(`/admin/users/${id}`, data),
}
