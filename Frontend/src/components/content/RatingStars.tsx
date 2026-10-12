import { useState } from 'react'
import { Star } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ratingService } from '@/services/rating.service'
import { useAuthStore } from '@/stores/auth-store'
import type { MyRating } from '@/types/library'

// ==========================================
// COMPONENT CHẤM ĐIỂM BẰNG NGÔI SAO
// ==========================================
export function RatingStars({ contentId }: { contentId: string }) {
  const isAuth = useAuthStore((s) => !!s.user)
  const qc = useQueryClient()

  // State nội bộ lưu tạm số sao khi người dùng rê chuột (hover)
  const [hover, setHover] = useState(0)

  // ==========================================
  // 1. TẢI DỮ LIỆU ĐÁNH GIÁ TỪ BACKEND
  // ==========================================
  
  // 1.1 Lấy tổng quan (Điểm trung bình và Tổng lượt đánh giá)
  const summary = useQuery({
    queryKey: ['rating-summary', contentId],
    enabled: isAuth,
    queryFn: async () => (await ratingService.getSummary(contentId)).data,
  })


  // 1.2 Lấy điểm đánh giá của chính người dùng hiện tại (Nếu đã đăng nhập)
  const mine = useQuery({
    queryKey: ['rating-mine', contentId],
    enabled: isAuth,
    retry: false,
    queryFn: async (): Promise<MyRating | null> => {
      try {
        return (await ratingService.getMine(contentId)).data ?? null
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 404) return null
        throw e
      }
    },
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['rating-summary', contentId] })
    qc.invalidateQueries({ queryKey: ['rating-mine', contentId] })
  }

  // ==========================================
  // 2. CÁC HÀM TƯƠNG TÁC (GỬI ĐÁNH GIÁ / XÓA ĐÁNH GIÁ)
  // ==========================================
  
  // Gửi điểm mới lên Backend
  const rate = useMutation({
    mutationFn: (score: number) => ratingService.rate(contentId, score),
    onSuccess: refresh,
  })
  
  // Rút lại (Xóa) điểm đánh giá cũ
  const clear = useMutation({
    mutationFn: () => ratingService.clear(contentId),
    onSuccess: refresh,
  })

  if (!isAuth) {
    return <p className="text-xs text-muted-foreground">Đăng nhập để xem và chấm điểm.</p>
  }

  const current = hover || mine.data?.score || 0
  const busy = rate.isPending || clear.isPending

  // ==========================================
  // 3. RENDER GIAO DIỆN (UI)
  // ==========================================
  return (
    <div className="space-y-1">
      {/* 3.1 Vùng vẽ các ngôi sao */}
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            aria-label={`Chấm ${n} sao`}
            onMouseEnter={() => setHover(n)}
            onClick={() => rate.mutate(n)}
          >
            <Star
              className={`h-5 w-5 ${n <= current ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
            />
          </button>
        ))}
        {mine.data && (
          <button
            type="button"
            disabled={busy}
            onClick={() => clear.mutate()}
            className="ml-2 text-xs text-muted-foreground underline"
          >
            Xoá đánh giá
          </button>
        )}
      </div>
      
      {/* 3.2 Hiển thị số liệu thống kê */}
      <p className="text-xs text-muted-foreground">
        {summary.data && summary.data.totalRatings > 0
          ? `${summary.data.averageScore.toFixed(1)} / 5 (${summary.data.totalRatings} lượt)`
          : 'Chưa có đánh giá'}
      </p>
    </div>
  )
}
