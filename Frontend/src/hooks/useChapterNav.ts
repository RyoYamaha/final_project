import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ContentDetailData } from '@/types/content'

// ==========================================
// HOOK TÌM CHƯƠNG TRƯỚC / CHƯƠNG SAU
// ==========================================
export function useChapterNav(contentId?: string, chapterId?: string) {
  // 1. Gọi API lấy thông tin chi tiết truyện (để lấy toàn bộ danh sách chương)
  const { data: content, isLoading, isError } = useQuery({
    queryKey: ['content', contentId],
    enabled: !!contentId,
    queryFn: async () => (await api.get<ContentDetailData>(`/content/${contentId}`)).data,
  })

  // 2. Lọc bỏ chương bị ẩn/chờ duyệt, chỉ giữ lại chương 'Published' và sắp xếp
  const chapters = (content?.chapters ?? [])
    .filter((c) => c.moderationStatus === 'Published')
    .sort((a, b) => a.number - b.number)

  // 3. Tìm vị trí (index) của chương hiện tại trong mảng vừa lọc
  const index = chapters.findIndex((c) => c.id === chapterId)
  const found = index >= 0

  // 4. Trả về kết quả: data truyện, trạng thái tải, và đặc biệt là prev (chương trước) / next (chương sau)
  return {
    content,
    isLoading,
    isError,
    chapter: found ? chapters[index] : undefined,
    prev: found ? chapters[index - 1] : undefined, // Nếu index = 0 (chương 1) thì prev sẽ là undefined (ẩn nút)
    next: found ? chapters[index + 1] : undefined,
  }
}
