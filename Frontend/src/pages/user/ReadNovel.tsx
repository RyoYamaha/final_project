import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useChapterNav } from '@/hooks/useChapterNav'
import { ChapterNav } from '@/components/content/ChapterNav'
import { Button } from '@/components/ui/button'
import type { ChapterContent } from '@/types/chapter'

export function ReadNovel() {
  // ==========================================
  // 1. LẤY ID TRUYỆN & ID CHƯƠNG TỪ URL
  // ==========================================
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>()
  
  // ==========================================
  // 2. GỌI HOOK TÍNH TOÁN ĐIỀU HƯỚNG
  // ==========================================
  // Hook này sẽ tự động lo việc tìm ra chương trước (nav.prev) và chương sau (nav.next)
  const nav = useChapterNav(id, chapterId)

  // ==========================================
  // 3. FETCH NỘI DUNG CHỮ (TEXT BODY) CỦA CHƯƠNG NÀY
  // ==========================================
  // Gọi endpoint Public (không cần Token)
  const body = useQuery({
    queryKey: ['novel-content', chapterId],
    enabled: !!chapterId,
    queryFn: async () =>
      (await api.get<ChapterContent>(`/novel/chapters/${chapterId}/text`)).data,
  })

  // ==========================================
  // 4. TỰ ĐỘNG CUỘN LÊN ĐẦU TRANG KHI ĐỔI CHƯƠNG
  // ==========================================
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [chapterId]) // Mỗi khi chapterId trên thanh địa chỉ thay đổi, hàm này sẽ chạy

  // Xử lý các trạng thái chờ / lỗi
  if (nav.isLoading || body.isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>
  }
  if (nav.isError || body.isError || !id) return <p>Không tải được chương này.</p>
  if (!nav.chapter) return <p>Chương không tồn tại hoặc chưa được xuất bản.</p>

  // ==========================================
  // 5. RENDER GIAO DIỆN
  // ==========================================
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Cụm Tiêu đề và Nút Hỏi AI */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{nav.content?.title}</h1>
          <p className="text-sm text-muted-foreground">
            Chương {nav.chapter.number}
            {nav.chapter.title ? `: ${nav.chapter.title}` : ''}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to={`/assistant/${id}`}>Hỏi AI</Link>
        </Button>
      </div>

      {/* Thanh điều hướng Ở TRÊN */}
      <ChapterNav contentId={id} prev={nav.prev} next={nav.next} readSegment="read-novel" />

      {/* Nội dung chính của truyện. whitespace-pre-line giúp giữ lại các dấu xuống dòng */}
      <article className="whitespace-pre-line text-base leading-8">{body.data?.textBody}</article>

      {/* Thanh điều hướng Ở DƯỚI (tiện cho user đọc xong khỏi cuộn lên) */}
      <ChapterNav contentId={id} prev={nav.prev} next={nav.next} readSegment="read-novel" />
    </div>
  )
}

export default ReadNovel
