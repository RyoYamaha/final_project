import { api } from '@/lib/api'
import type { AppNotification } from '@/types/notification'



export const notificationService = {
  getAll: () => api.get<AppNotification[]>('/notifications'),
  getUnreadCount: () => api.get<number>('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}
