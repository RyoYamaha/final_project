import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { libraryService } from '@/services/library.service'
import { useAuthStore } from '@/stores/auth-store'

export type CollectionKind = 'bookmarks' | 'favorites'

// ==========================================
// CUSTOM HOOK: QUẢN LÝ THƯ VIỆN CỦA NGƯỜI DÙNG
// ==========================================
// kind: Nhận vào 'bookmarks' hoặc 'favorites'
export function useCollection(kind: CollectionKind) {
  const isAuth = useAuthStore((s) => !!s.user)
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: [kind] })
  const refreshNotifications = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['unread-count'] })
  }

  // 1. QUERY: Lấy danh sách (Chỉ lấy khi đã đăng nhập)
  const query = useQuery({
    queryKey: [kind],
    enabled: isAuth,
    queryFn: async () => (await libraryService.getCollection(kind)).data,
  })

  // 2. ADD: Thêm truyện vào thư viện. Thành công thì tải lại danh sách
  const add = useMutation({
    mutationFn: (contentId: string) => libraryService.add(kind, contentId),
    onSuccess: () => {
      invalidate()
      refreshNotifications()
    },
  })

  // 3. REMOVE: Xóa truyện khỏi thư viện
  const remove = useMutation({
    mutationFn: (contentId: string) => libraryService.remove(kind, contentId),
    onSuccess: invalidate,
  })

  // 4. HAS: Hàm tiện ích giúp kiểm tra nhanh xem 1 truyện có trong thư viện chưa
  const has = (contentId: string) => !!query.data?.some((e) => e.contentId === contentId)

  // Trả về toàn bộ biến/hàm để Component sử dụng
  return { ...query, add, remove, has }
}
