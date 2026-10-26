import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { contentService } from '@/services/content.service'
import { PaidChapterNotice } from '@/components/content/PaidChapterNotice'
import { CommentSection } from '@/components/comment/CommentSection'
import { useChapterNav } from '@/hooks/useChapterNav'
import { readingProgressService } from '@/services/reading-progress.service'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ArrowRight,
  ImageOff,
  Sparkles,
  AlertTriangle,
  Settings2,
  Minus,
  Plus,
} from 'lucide-react'
import { ReportModal } from '@/components/shared/ReportModal'
import { AiReadingDrawer } from '@/components/content/AiReadingDrawer'

type ReaderTheme = 'dark' | 'sepia' | 'black'
type ReaderFont = 'sans' | 'serif' | 'mono'

export function ReadNovel() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nav = useChapterNav(id, chapterId)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>('text')

  // Reading appearance preferences
  const [theme, setTheme] = useState<ReaderTheme>('dark')
  const [fontSize, setFontSize] = useState<number>(18)
  const [fontFamily, setFontFamily] = useState<ReaderFont>('sans')

  const user = useAuthStore((state) => state.user)
  const chapterEndRef = useRef<HTMLDivElement>(null)
  const markedChapters = useRef(new Set<string>())

  // Text content query
  const body = useQuery({
    queryKey: ['novel-content', chapterId],
    enabled: !!chapterId,
    retry: (failureCount, error) =>
      !(isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) &&
      failureCount < 2,
    queryFn: async () => (await contentService.getNovelChapterText(chapterId!)).data,
  })

  // PDF pages query (if available)
  const pdfPages = useQuery({
    queryKey: ['novel-pdf-pages', chapterId],
    enabled: !!chapterId,
    retry: false,
    queryFn: async () => (await contentService.getNovelChapterPages(chapterId!)).data,
  })

  const markChapterRead = useMutation({
    mutationFn: ({ contentId, chapterId: completedChapterId }: { contentId: string; chapterId: string }) =>
      readingProgressService.completeChapter(contentId, { chapterId: completedChapterId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reading-progress'] }),
    onError: (_error, variables) => {
      markedChapters.current.delete(variables.chapterId)
    },
  })
  const completeChapter = markChapterRead.mutate

  const refreshLockedChapter = async () => {
    await queryClient.invalidateQueries({ queryKey: ['novel-content', chapterId] })
  }

  useEffect(() => {
    const endMarker = chapterEndRef.current
    const currentChapterId = nav.chapter?.id
    if (!endMarker || !user || !id || !currentChapterId || body.data?.chapterId !== currentChapterId) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || markedChapters.current.has(currentChapterId)) return
        markedChapters.current.add(currentChapterId)
        completeChapter({ contentId: id, chapterId: currentChapterId })
        observer.disconnect()
      },
      { threshold: 0.8 }
    )

    observer.observe(endMarker)
    return () => observer.disconnect()
  }, [body.data, completeChapter, id, nav.chapter?.id, user])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [chapterId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' && nav.next) navigate(`/content/${id}/read-novel/${nav.next.id}`)
      if (e.key === 'ArrowLeft' && nav.prev) navigate(`/content/${id}/read-novel/${nav.prev.id}`)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nav, navigate, id])

  if (nav.isLoading || body.isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm">Đang tải chương tiểu thuyết...</p>
      </div>
    )
  }

  if (
    body.isError &&
    isAxiosError(body.error) &&
    [401, 403].includes(body.error.response?.status ?? 0) &&
    id
  ) {
    return (
      <PaidChapterNotice
        contentId={id}
        contentTitle={nav.content?.title}
        priceCoins={nav.content?.priceCoins ?? 0}
        onPurchaseSuccess={refreshLockedChapter}
      />
    )
  }

  if (nav.isError || body.isError || !id) {
    return <div className="p-12 text-center text-destructive">Không tải được chương này.</div>
  }

  if (!nav.chapter) {
    return <div className="p-12 text-center">Chương không tồn tại hoặc chưa được xuất bản.</div>
  }

  const hasPdfPages = (pdfPages.data?.length ?? 0) > 0

  const themeClasses = {
    dark: 'bg-[#1e2631] text-[#f3f5f8] border-white/10',
    sepia: 'bg-[#26211a] text-[#f4ecd8] border-[#3e3427]',
    black: 'bg-[#0b0f14] text-[#e2e8f0] border-white/5',
  }[theme]

  const fontClasses = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }[fontFamily]

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-7xl flex-col gap-6 px-2 py-4 lg:flex-row lg:px-4">
      {/* LEFT: READING AREA */}
      <div className="flex-1 flex flex-col min-w-0 space-y-4">
        {/* Top Control Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#252f3b] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-muted">
              {nav.content?.coverImageUrl ? (
                <img src={nav.content.coverImageUrl} alt={nav.content.title} className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-4 w-4 m-auto text-muted-foreground/40" />
              )}
            </div>
            <div className="min-w-0">
              <Link to={`/content/${id}`} className="truncate font-bold text-base hover:text-primary transition-colors block">
                {nav.content?.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Chương {nav.chapter.number} {nav.chapter.title && `- ${nav.chapter.title}`}
                </span>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-xs text-destructive hover:underline inline-flex items-center"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" /> Báo cáo
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons: AI, View Toggle, Reading Preferences, Prev/Next */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* AI Assistant Quick Drawer Button */}
            <Button
              size="sm"
              onClick={() => setIsAiDrawerOpen(true)}
              className="rounded-xl bg-gradient-to-r from-amber-400 to-purple-600 font-bold text-black shadow-md hover:opacity-90"
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> Trợ lý AI
            </Button>

            {/* View Mode Toggle (Text vs PDF if PDF uploaded) */}
            {hasPdfPages && (
              <div className="flex items-center rounded-xl border border-white/10 bg-[#1e2631] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('text')}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                    viewMode === 'text' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('pdf')}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                    viewMode === 'pdf' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  PDF
                </button>
              </div>
            )}

            {/* Appearance Settings Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-xl border-white/10"
              aria-label="Cài đặt giao diện đọc"
            >
              <Settings2 className="h-4 w-4" />
            </Button>

            {/* Chapter Prev / Next */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#1e2631] p-1">
              <Button
                onClick={() => nav.prev && navigate(`/content/${id}/read-novel/${nav.prev.id}`)}
                disabled={!nav.prev}
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-3 text-xs"
              >
                Trước
              </Button>
              <Button
                onClick={() => nav.next && navigate(`/content/${id}/read-novel/${nav.next.id}`)}
                disabled={!nav.next}
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-3 text-xs"
              >
                Sau
              </Button>
            </div>
          </div>
        </div>

        {/* Reading Appearance Settings Box (Collapsible) */}
        {showSettings && (
          <div className="rounded-2xl border border-white/10 bg-[#252f3b] p-4 text-xs space-y-3 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Theme Picker */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Màu nền:</span>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`rounded-lg px-3 py-1 font-semibold border ${
                    theme === 'dark' ? 'border-primary bg-[#1e2631] text-primary' : 'border-white/10 bg-[#1e2631] text-slate-300'
                  }`}
                >
                  Xanh Đậm
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('sepia')}
                  className={`rounded-lg px-3 py-1 font-semibold border ${
                    theme === 'sepia' ? 'border-amber-500 bg-[#26211a] text-amber-300' : 'border-white/10 bg-[#26211a] text-[#f4ecd8]'
                  }`}
                >
                  Vàng Giấy
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('black')}
                  className={`rounded-lg px-3 py-1 font-semibold border ${
                    theme === 'black' ? 'border-primary bg-black text-primary' : 'border-white/10 bg-black text-slate-300'
                  }`}
                >
                  Đen Huyền
                </button>
              </div>

              {/* Font Family Picker */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Phông chữ:</span>
                <button
                  type="button"
                  onClick={() => setFontFamily('sans')}
                  className={`rounded-lg px-2.5 py-1 font-sans ${fontFamily === 'sans' ? 'bg-primary text-black font-bold' : 'bg-muted'}`}
                >
                  Sans
                </button>
                <button
                  type="button"
                  onClick={() => setFontFamily('serif')}
                  className={`rounded-lg px-2.5 py-1 font-serif ${fontFamily === 'serif' ? 'bg-primary text-black font-bold' : 'bg-muted'}`}
                >
                  Serif
                </button>
                <button
                  type="button"
                  onClick={() => setFontFamily('mono')}
                  className={`rounded-lg px-2.5 py-1 font-mono ${fontFamily === 'mono' ? 'bg-primary text-black font-bold' : 'bg-muted'}`}
                >
                  Mono
                </button>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Cỡ chữ:</span>
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                  className="rounded-lg bg-[#1e2631] p-1.5 hover:bg-white/10 border border-white/10"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="tabular-nums font-bold px-2">{fontSize}px</span>
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.min(28, s + 2))}
                  className="rounded-lg bg-[#1e2631] p-1.5 hover:bg-white/10 border border-white/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Novel Content Canvas */}
        <div className={`flex-1 rounded-3xl border p-6 shadow-2xl transition-all sm:p-10 lg:p-14 ${themeClasses}`}>
          <h2 className="mb-8 border-b border-white/10 pb-4 text-2xl font-black">
            Chương {nav.chapter.number}
            {nav.chapter.title ? `: ${nav.chapter.title}` : ''}
          </h2>

          {viewMode === 'pdf' && hasPdfPages ? (
            /* PDF Page Images Mode */
            <div className="flex flex-col items-center gap-4">
              {pdfPages.data?.map((p) => (
                <img
                  key={p.id}
                  src={p.imageUrl}
                  alt={`Trang ${p.pageNumber}`}
                  className="max-w-full rounded-xl shadow-lg border border-white/10"
                />
              ))}
            </div>
          ) : (
            /* Text Content Mode */
            <article
              className={`mx-auto max-w-[72ch] whitespace-pre-line leading-relaxed ${fontClasses}`}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
            >
              {body.data?.textBody || 'Chương này chưa có nội dung văn bản.'}
            </article>
          )}

          {/* Bottom Pagination */}
          <div className="mt-14 flex items-center justify-between border-t border-white/10 pt-8">
            <Button
              onClick={() => nav.prev && navigate(`/content/${id}/read-novel/${nav.prev.id}`)}
              disabled={!nav.prev}
              variant="outline"
              className="rounded-xl border-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Chương trước
            </Button>
            <Button
              onClick={() => nav.next && navigate(`/content/${id}/read-novel/${nav.next.id}`)}
              disabled={!nav.next}
              variant="outline"
              className="rounded-xl border-white/10"
            >
              Chương tiếp theo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div ref={chapterEndRef} aria-hidden="true" className="h-px" />
        </div>
      </div>

      {/* RIGHT: COMMENT DISCUSSION SECTION */}
      {id && <CommentSection contentId={id} />}

      {/* SLIDE-OVER AI READING ASSISTANT DRAWER */}
      <AiReadingDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        contentTitle={nav.content?.title}
        chapterNumber={nav.chapter.number}
        chapterTitle={nav.chapter.title}
        chapterContextText={body.data?.textBody}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="Chapter"
        targetId={chapterId!}
      />
    </div>
  )
}

export default ReadNovel
