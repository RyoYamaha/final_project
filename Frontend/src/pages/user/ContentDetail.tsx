import { Link, useParams } from 'react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  ImageOff,
  AlertTriangle,
  Check,
  BookOpen,
  Sparkles,
  ArrowUpDown,
  Coins,
  ShieldCheck,
  Layers,
  Calendar,
} from 'lucide-react'
import { contentService } from '@/services/content.service'
import { readingProgressService } from '@/services/reading-progress.service'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { ContentActions } from '@/components/content/ContentActions'
import { RatingStars } from '@/components/content/RatingStars'
import { ReportModal } from '@/components/shared/ReportModal'
import { CommentSection } from '@/components/comment/CommentSection'

export function ContentDetail() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [sortDescending, setSortDescending] = useState(false)
  const user = useAuthStore((state) => state.user)
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['content', id],
    enabled: !!id,
    retry: (count, err) => !(isAxiosError(err) && err.response?.status === 404) && count < 2,
    queryFn: async () => (await contentService.getDetail(id!)).data,
  })

  const completedChapters = useQuery({
    queryKey: ['reading-progress', id],
    enabled: !!user && !!id,
    queryFn: () => readingProgressService.getCompletedChapterIds(id!),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm">Đang tải thông tin truyện...</p>
      </div>
    )
  }

  if (isError) {
    const notFound = isAxiosError(error) && error.response?.status === 404
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">
          {notFound ? 'Không tìm thấy truyện' : 'Không tải được thông tin truyện'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {notFound
            ? 'Tác phẩm bạn yêu cầu không tồn tại hoặc đã bị gỡ bỏ.'
            : 'Đã xảy ra lỗi kết nối với máy chủ. Vui lòng thử lại.'}
        </p>
        {!notFound && (
          <Button size="sm" variant="outline" onClick={() => refetch()} className="rounded-xl">
            Thử lại
          </Button>
        )}
      </div>
    )
  }

  if (!data) return null

  // Lọc chapter đã Publish
  const publishedChapters = (data.chapters || []).filter((c) => c.moderationStatus === 'Published')
  const sortedChapters = [...publishedChapters].sort((a, b) =>
    sortDescending ? b.number - a.number : a.number - b.number
  )

  const readPath = (chapterId: string) =>
    `/content/${data.id}/${data.type === 'Manga' ? 'read-manga' : 'read-novel'}/${chapterId}`
  const completedChapterIds = new Set(completedChapters.data ?? [])

  const firstChapter = publishedChapters.slice().sort((a, b) => a.number - b.number)[0]

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-2 pb-12 sm:px-4">
      {/* 1. CINEMATIC BACKDROP BANNER */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-[#1e2631] shadow-2xl">
        {data.coverImageUrl && (
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <img
              src={data.coverImageUrl}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover object-center filter blur-3xl opacity-20 scale-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e2631] via-[#1e2631]/80 to-transparent" />
          </div>
        )}

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:p-8">
          {/* Cover Image Frame */}
          <div className="aspect-[2/3] w-48 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-[#252f3b] shadow-2xl">
            {data.coverImageUrl ? (
              <img
                src={data.coverImageUrl}
                alt={data.title}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/40">
                <ImageOff className="h-10 w-10" />
                <span className="text-xs font-semibold">NOVA MANGA</span>
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-sky-400/30 bg-sky-950/80 px-2.5 py-0.5 text-xs font-bold text-sky-300">
                {data.type}
              </span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                {data.storyStatus === 'Completed' ? 'Đã hoàn thành' : 'Đang tiến hành'}
              </span>
              {data.ownershipTier === 'Licensed' && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-950/80 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Bản quyền chính thức
                </span>
              )}
              {typeof data.priceCoins === 'number' && data.priceCoins > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-black/60 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                  <Coins className="h-3.5 w-3.5" /> {data.priceCoins} coin / chương
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
              {data.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
              <p>
                Đăng bởi: <span className="font-semibold text-white">{data.uploader?.username || 'Ẩn danh'}</span>
              </p>
              {data.publisher && (
                <p>
                  NXB: <span className="font-semibold text-primary">{data.publisher.organizationName}</span>
                </p>
              )}
            </div>

            {/* Fan translation backlink */}
            {data.parentContent && (
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs text-slate-300">
                Bản dịch cộng đồng từ tác phẩm gốc:{' '}
                <Link
                  to={`/content/${data.parentContent.id}`}
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  {data.parentContent.title}
                </Link>
              </div>
            )}

            {/* Genres & Tags */}
            <div className="flex flex-wrap gap-1.5">
              {(data.genres || []).map(({ genre }) => (
                <span
                  key={genre.id}
                  className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  {genre.name}
                </span>
              ))}
              {(data.tags || []).map(({ tag }) => (
                <span
                  key={tag.id}
                  className="rounded-lg border border-white/10 bg-[#252f3b] px-2.5 py-1 text-xs text-slate-400"
                >
                  #{tag.name}
                </span>
              ))}
            </div>

            {/* Action Buttons & Rating */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <ContentActions contentId={data.id} />
              <RatingStars contentId={data.id} />
            </div>

            {/* Read & AI CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {firstChapter && (
                <Button asChild size="lg" className="rounded-xl px-6 font-semibold shadow-lg shadow-primary/20">
                  <Link to={readPath(firstChapter.id)}>
                    <BookOpen className="mr-2 h-4 w-4" /> Đọc từ đầu (Ch. {firstChapter.number})
                  </Link>
                </Button>
              )}

              {/* AI Reading Assistant Button */}
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-xl border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
              >
                <Link to={`/assistant/${data.id}`}>
                  <Sparkles className="mr-2 h-4 w-4" /> Trợ lý AI tác phẩm
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-destructive hover:bg-destructive/10"
                onClick={() => setIsReportModalOpen(true)}
              >
                <AlertTriangle className="mr-1.5 h-4 w-4" /> Báo cáo vi phạm
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="Content"
        targetId={data.id}
      />

      {/* 2. SYNOPSIS */}
      <section className="rounded-2xl border border-white/10 bg-[#252f3b] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">Giới thiệu tác phẩm</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
          {data.synopsis || 'Tác phẩm chưa có phần tóm tắt giới thiệu.'}
        </p>
      </section>

      {/* 3. CHAPTER LIST */}
      <section className="rounded-2xl border border-white/10 bg-[#252f3b] p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              Danh sách chương ({publishedChapters.length})
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDescending((prev) => !prev)}
            className="rounded-xl border-white/10 text-xs"
          >
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
            {sortDescending ? 'Mới nhất trước' : 'Cũ nhất trước'}
          </Button>
        </div>

        {publishedChapters.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có chương nào được phát hành cho tác phẩm này.
          </p>
        ) : (
          <div className="max-h-[500px] overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5 bg-[#1e2631]">
            {sortedChapters.map((c) => {
              const isRead = completedChapterIds.has(c.id)
              return (
                <Link
                  key={c.id}
                  to={readPath(c.id)}
                  className={`flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors ${
                    isRead
                      ? 'bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-foreground hover:bg-white/5'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {isRead ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Đã đọc" />
                    ) : (
                      <div className="h-2 w-2 shrink-0 rounded-full bg-slate-600" />
                    )}
                    <span className="truncate font-medium">
                      Chương {c.number}
                      {c.title ? `: ${c.title}` : ''}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    {(c.publishedAt || c.createdAt) && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(c.publishedAt ?? c.createdAt!).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 4. COMMENT & DISCUSSION SECTION */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Bình luận & Thảo luận</h2>
        <CommentSection contentId={data.id} />
      </section>
    </div>
  )
}

export default ContentDetail
