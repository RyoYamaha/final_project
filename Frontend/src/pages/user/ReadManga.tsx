import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contentService } from '@/services/content.service'
import { CommentSection } from '@/components/comment/CommentSection'
import { useChapterNav } from '@/hooks/useChapterNav'
import { readingProgressService } from '@/services/reading-progress.service'
import { useAuthStore } from '@/stores/auth-store'
import { ArrowLeft, ArrowRight, ImageOff, AlertTriangle } from 'lucide-react'
import { ReportModal } from '@/components/shared/ReportModal'

export function ReadManga() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nav = useChapterNav(id, chapterId)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const markedChapters = useRef(new Set<string>())

  const pages = useQuery({
    queryKey: ['manga-pages', chapterId],
    enabled: !!chapterId,
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
    <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-6 p-4 lg:p-8 min-h-screen">
      
      {/* LEFT: READING AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-border/50 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-20 bg-muted rounded overflow-hidden flex-shrink-0 flex items-center justify-center border shadow-sm">
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
          
          {/* Pagination Controls */}
          {totalPages > 0 && (
            <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-full border border-border">
              <button 
                onClick={handlePrevPage}
                disabled={currentPageIndex === 0 && !nav.prev}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background hover:shadow-sm transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="px-4 text-sm font-bold tabular-nums min-w-[70px] text-center">
                {currentPageIndex + 1} / {totalPages}
              </div>
              
              <button 
                onClick={handleNextPage}
                disabled={currentPageIndex === totalPages - 1 && !nav.next}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background hover:shadow-sm transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetType="Chapter"
          targetId={chapterId!}
        />

        {/* Image Container */}
        <div className="flex-1 bg-black/5 dark:bg-black/40 rounded-xl overflow-hidden flex flex-col items-center justify-center min-h-[600px] border border-border/50 relative group select-none">
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
