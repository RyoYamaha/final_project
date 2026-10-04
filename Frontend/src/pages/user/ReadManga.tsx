import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useChapterNav } from '@/hooks/useChapterNav'
import { ChapterNav } from '@/components/content/ChapterNav'
import type { ChapterPage } from '@/types/chapter'

export function ReadManga() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>()
  const nav = useChapterNav(id, chapterId)

  const pages = useQuery({
    queryKey: ['manga-pages', chapterId],
    enabled: !!chapterId,
    queryFn: async () =>
      (await api.get<ChapterPage[]>(`/manga/chapters/${chapterId}/pages`)).data,
  })

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [chapterId])

  if (nav.isLoading || pages.isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>
  }
  if (nav.isError || pages.isError || !id) {
    return <p>Không tải được chương này.</p>
  }
  if (!nav.chapter) return <p>Chương không tồn tại hoặc chưa được xuất bản.</p>

  const sorted = [...(pages.data ?? [])].sort((a, b) => a.pageNumber - b.pageNumber)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{nav.content?.title}</h1>
        <p className="text-sm text-muted-foreground">
          Chương {nav.chapter.number}
          {nav.chapter.title ? `: ${nav.chapter.title}` : ''}
        </p>
      </div>

      <ChapterNav contentId={id} prev={nav.prev} next={nav.next} readSegment="read-manga" />

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chương này chưa có trang nào.</p>
      ) : (
        <div className="flex flex-col items-center">
          {sorted.map((p) => (
            <img
              key={p.id}
              src={p.imageUrl}
              alt={`Trang ${p.pageNumber}`}
              loading="lazy"
              className="block w-full"
            />
          ))}
        </div>
      )}

      <ChapterNav contentId={id} prev={nav.prev} next={nav.next} readSegment="read-manga" />
    </div>
  )
}

export default ReadManga
