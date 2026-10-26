import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Clock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { adminService } from '@/services/admin.service'
import { useAppDialog } from '@/components/common/AppDialogProvider'

export function ChapterReview() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirm } = useAppDialog()
  const [error, setError] = useState<string | null>(null)
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo

  const chapter = useQuery({
    queryKey: ['admin-chapter-detail', id],
    queryFn: () => adminService.getChapterDetail(id!),
    enabled: !!id,
  })

  const review = useMutation({
    mutationFn: (action: 'approve' | 'reject') => {
      if (!id) throw new Error('Thiếu chapter ID');
      if (action === 'approve') return adminService.approveChapter(id);
      return adminService.rejectChapter(id);
    },
    onSuccess: async () => {
      const contentId = chapter.data?.contentId
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-content'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-content-detail', contentId] }),
      ])
      navigate(returnTo ?? `/admin/content/${contentId}`)
    },
    onError: () => setError('Không thể cập nhật chapter. Có thể chapter đã được xử lý, hãy tải lại.'),
  })

  if (chapter.isLoading) {
    return <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4 animate-spin" />Đang tải chapter...</div>
  }

  if (chapter.isError || !chapter.data) {
    return <p className="p-6 text-sm text-destructive">Không tải được chapter.</p>
  }

  const data = chapter.data
  const textBody = data.chapterContent?.textBody ?? ''
  const canModerate = data.moderationStatus === 'PendingReview'

  const confirmReview = async (action: 'approve' | 'reject') => {
    const approved = action === 'approve'
    const confirmed = await confirm({
      title: approved ? 'Xác nhận duyệt chapter' : 'Xác nhận từ chối chapter',
      description: `${approved ? 'Duyệt và xuất bản' : 'Từ chối'} chapter ${data.number}${data.title ? `: ${data.title}` : ''}?`,
      confirmLabel: approved ? 'Duyệt chapter' : 'Từ chối chapter',
      tone: approved ? 'default' : 'destructive',
    })
    if (confirmed) {
      setError(null)
      review.mutate(action)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <Link
        to={returnTo ?? `/admin/content/${data.contentId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại truyện
      </Link>

      <header className="space-y-2 border-b border-border pb-5">
        <p className="text-sm text-muted-foreground">
          <Link to={`/admin/content/${data.contentId}`} className="underline underline-offset-4">{data.content.title}</Link>
          {' · '}{data.content.type}
        </p>
        <h1 className="text-2xl font-bold">
          Chapter {data.number}{data.title ? `: ${data.title}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          Trạng thái chapter: {data.moderationStatus} · Trạng thái truyện: {data.content.publicationStatus}
        </p>
      </header>

      {textBody ? (
        <article className="max-h-[70vh] overflow-y-auto rounded-md border border-border bg-card p-5 text-sm leading-7 whitespace-pre-wrap">
          {textBody}
        </article>
      ) : data.pages.length > 0 ? (
        <div className="max-h-[75vh] space-y-4 overflow-y-auto rounded-md border border-border bg-muted/20 p-4">
          {data.pages.map((page) => (
            <figure key={page.id} className="space-y-2 text-center">
              <figcaption className="text-xs text-muted-foreground">Trang {page.pageNumber}</figcaption>
              <a href={page.imageUrl} target="_blank" rel="noreferrer">
                <img
                  src={page.imageUrl}
                  alt={`Trang ${page.pageNumber}`}
                  loading="lazy"
                  className="mx-auto h-auto max-w-full rounded border border-border object-contain"
                />
              </a>
            </figure>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Chapter chưa có nội dung.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {canModerate && (
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" disabled={review.isPending} onClick={() => void confirmReview('reject')}>
            Từ chối chapter
          </Button>
          <Button disabled={review.isPending || (!textBody.trim() && data.pages.length === 0)} onClick={() => void confirmReview('approve')}>
            Duyệt chapter
          </Button>
        </div>
      )}
    </div>
  )
}

export default ChapterReview