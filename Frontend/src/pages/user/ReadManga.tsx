import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { contentService } from '@/services/content.service'
import { PaidChapterNotice } from '@/components/content/PaidChapterNotice'
import { CommentSection } from '@/components/comment/CommentSection'
import { useChapterNav } from '@/hooks/useChapterNav'
import { readingProgressService } from '@/services/reading-progress.service'
import { useAuthStore } from '@/stores/auth-store'
import { ArrowLeft, ArrowRight, ImageOff, AlertTriangle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReportModal } from '@/components/shared/ReportModal'
import { AiReadingDrawer } from '@/components/content/AiReadingDrawer'

export function ReadManga() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nav = useChapterNav(id, chapterId)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const markedChapters = useRef(new Set<string>())

  const pages = useQuery({
    queryKey: ['manga-pages', chapterId],
    enabled: !!chapterId,
    retry: (failureCount, error) =>
      !(isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) &&
      failureCount < 2,
    queryFn: async () =>
      (await contentService.getMangaChapterPages(chapterId!)).data,
  })

  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const sorted = [...(pages.data ?? [])].sort((a, b) => a.pageNumber - b.pageNumber)
  const totalPages = sorted.length
  const markChapterRead = useMutation({
    mutationFn: ({ contentId, chapterId: completedChapterId, lastPageNumber }: {
      contentId: string
      chapterId: string
      lastPageNumber: number
    }) => readingProgressService.completeChapter(contentId, {
      chapterId: completedChapterId,
      lastPageNumber,
    }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['reading-progress'] }),
    onError: (_error, variables) => {
      markedChapters.current.delete(variables.chapterId)
    },
  })
  const completeChapter = markChapterRead.mutate
  const refreshLockedChapter = async () => {
    await queryClient.invalidateQueries({ queryKey: ['manga-pages', chapterId] })
  }

  useEffect(() => {
    const currentChapterId = nav.chapter?.id
    const currentChapterPagesLoaded = pages.data?.some((page) => page.chapterId === currentChapterId)
    if (!user || !id || !currentChapterId || !currentChapterPagesLoaded || totalPages === 0 || currentPageIndex !== totalPages - 1) return
    if (markedChapters.current.has(currentChapterId)) return
    markedChapters.current.add(currentChapterId)
    completeChapter({ contentId: id, chapterId: currentChapterId, lastPageNumber: totalPages })
  }, [completeChapter, currentPageIndex, id, nav.chapter?.id, pages.data, totalPages, user])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setCurrentPageIndex(0)
  }, [chapterId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNextPage()
      if (e.key === 'ArrowLeft') handlePrevPage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPageIndex, pages.data, nav])

  if (nav.isLoading || pages.isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Đang tải...</div>
  }
  if (
    pages.isError &&
    isAxiosError(pages.error) &&
    [401, 403].includes(pages.error.response?.status ?? 0) &&
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
  if (nav.isError || pages.isError || !id) {
    return <div className="p-12 text-center text-destructive">Không tải được chương này.</div>
  }
  if (!nav.chapter) return <div className="p-12 text-center">Chương không tồn tại hoặc chưa được xuất bản.</div>

  const handleNextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(p => p + 1)
    } else if (nav.next) {
      navigate(`/content/${id}/read-manga/${nav.next.id}`)
    }
  }

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(p => p - 1)
    } else if (nav.prev) {
      navigate(`/content/${id}/read-manga/${nav.prev.id}`)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-7xl flex-col gap-5 px-0 py-2 lg:flex-row lg:gap-7 lg:py-4">
      
      {/* LEFT: READING AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Info */}
        <div className="mb-4 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border/80 bg-card/70 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-4">
            <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
              {nav.content?.coverImageUrl ? (
                <img src={nav.content.coverImageUrl} alt={nav.content.title} className="w-full h-full object-cover" />
              ) : (
                 <ImageOff className="w-6 h-6 text-muted-foreground/50" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold line-clamp-1">{nav.content?.title}</h1>
              <p className="text-sm text-muted-foreground mb-2">Author Name</p>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center px-3 py-1 bg-secondary text-secondary-foreground text-xs font-semibold rounded-full">
                  Chapter {nav.chapter.number} {nav.chapter.title && `- ${nav.chapter.title}`}
                </div>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-xs text-destructive hover:underline flex items-center"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" /> Báo cáo
                </button>
              </div>
              {markChapterRead.isError && markChapterRead.variables?.chapterId === nav.chapter.id && (
                <button
                  type="button"
                  onClick={() => {
                    markedChapters.current.delete(nav.chapter!.id)
                    markChapterRead.mutate({ contentId: id, chapterId: nav.chapter!.id, lastPageNumber: totalPages })
                  }}
                  className="mt-2 text-xs text-destructive hover:underline"
                >
                  Không lưu được tiến độ. Thử lại
                </button>
              )}
            </div>
          </div>
          
          {/* Action & Pagination Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsAiDrawerOpen(true)}
              className="rounded-xl bg-gradient-to-r from-amber-400 to-purple-600 font-bold text-black shadow-md hover:opacity-90"
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> Trợ lý AI
            </Button>

            {totalPages > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1e2631] p-1">
                <button 
                  onClick={handlePrevPage}
                  disabled={currentPageIndex === 0 && !nav.prev}
                  className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/5 disabled:opacity-30"
                  aria-label="Trang trước"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                
                <div className="px-3 text-xs font-bold tabular-nums min-w-[65px] text-center text-foreground">
                  {currentPageIndex + 1} / {totalPages}
                </div>
                
                <button 
                  onClick={handleNextPage}
                  disabled={currentPageIndex === totalPages - 1 && !nav.next}
                  className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/5 disabled:opacity-30"
                  aria-label="Trang sau"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetType="Chapter"
          targetId={chapterId!}
        />

        <AiReadingDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          contentTitle={nav.content?.title}
          chapterNumber={nav.chapter.number}
          chapterTitle={nav.chapter.title}
        />

        {/* Image Container */}
        <div className="relative flex min-h-[45vh] flex-1 select-none flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-[#151b23] shadow-lg shadow-black/10 sm:min-h-[60vh] lg:min-h-[600px]">
          {totalPages === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center">
              <ImageOff className="w-12 h-12 mb-4 opacity-20" />
              <p>Chương này chưa có trang nào.</p>
            </div>
          ) : (
            <>
              {/* Invisible Click Zones for quick navigation */}
              <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={handlePrevPage} title="Previous Page"></div>
              <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer" onClick={handleNextPage} title="Next Page"></div>
              
              <img
                key={sorted[currentPageIndex].id}
                src={sorted[currentPageIndex].imageUrl}
                alt={`Page ${sorted[currentPageIndex].pageNumber}`}
                className="max-w-full max-h-[85vh] object-contain shadow-2xl transition-opacity duration-300 pointer-events-none"
              />
            </>
          )}
        </div>
      </div>

      {id && <CommentSection contentId={id} />}

    </div>
  )
}

export default ReadManga
