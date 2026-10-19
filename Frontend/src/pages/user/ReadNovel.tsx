import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contentService } from '@/services/content.service'
import { CommentSection } from '@/components/comment/CommentSection'
import { useChapterNav } from '@/hooks/useChapterNav'
import { readingProgressService } from '@/services/reading-progress.service'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, ImageOff, Sparkles, AlertTriangle } from 'lucide-react'
import { ReportModal } from '@/components/shared/ReportModal'

export function ReadNovel() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nav = useChapterNav(id, chapterId)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const chapterEndRef = useRef<HTMLDivElement>(null)
  const markedChapters = useRef(new Set<string>())

  const body = useQuery({
    queryKey: ['novel-content', chapterId],
    enabled: !!chapterId,
    queryFn: async () =>
      (await contentService.getNovelChapterText(chapterId!)).data,
  })

  const markChapterRead = useMutation({
    mutationFn: ({ contentId, chapterId: completedChapterId }: { contentId: string; chapterId: string }) =>
      readingProgressService.completeChapter(contentId, { chapterId: completedChapterId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['reading-progress'] }),
    onError: (_error, variables) => {
      markedChapters.current.delete(variables.chapterId)
    },
  })
  const completeChapter = markChapterRead.mutate

  useEffect(() => {
    const endMarker = chapterEndRef.current
    const currentChapterId = nav.chapter?.id
    if (!endMarker || !user || !id || !currentChapterId || body.data?.chapterId !== currentChapterId) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || markedChapters.current.has(currentChapterId)) return
      markedChapters.current.add(currentChapterId)
      completeChapter({ contentId: id, chapterId: currentChapterId })
      observer.disconnect()
    }, { threshold: 1 })

    observer.observe(endMarker)
    return () => observer.disconnect()
  }, [body.data, completeChapter, id, nav.chapter?.id, user])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [chapterId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && nav.next) navigate(`/content/${id}/read-novel/${nav.next.id}`)
      if (e.key === 'ArrowLeft' && nav.prev) navigate(`/content/${id}/read-novel/${nav.prev.id}`)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nav, navigate, id])

  if (nav.isLoading || body.isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Đang tải...</div>
  }
  if (nav.isError || body.isError || !id) return <div className="p-12 text-center text-destructive">Không tải được chương này.</div>
  if (!nav.chapter) return <div className="p-12 text-center">Chương không tồn tại hoặc chưa được xuất bản.</div>

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
            </div>
          </div>
          
          {/* Action / Nav Controls */}
          <div className="flex items-center gap-3">
             <Button asChild size="sm" variant="outline" className="h-10 px-4 rounded-full font-semibold border-primary/20 hover:bg-primary/5 text-primary">
               <Link to={`/assistant/${id}`}><Sparkles className="w-4 h-4 mr-1.5" /> Hỏi AI</Link>
             </Button>
            
            <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-full border border-border">
              <Button 
                onClick={() => nav.prev && navigate(`/content/${id}/read-novel/${nav.prev.id}`)}
                disabled={!nav.prev}
                variant="ghost"
                size="sm"
                className="h-8 px-4 rounded-full font-medium"
              >
                Chương {nav.prev ? nav.prev.number : '...'}
              </Button>
              <Button 
                onClick={() => nav.next && navigate(`/content/${id}/read-novel/${nav.next.id}`)}
                disabled={!nav.next}
                variant="ghost"
                size="sm"
                className="h-8 px-4 rounded-full font-medium"
              >
                Chương {nav.next ? nav.next.number : '...'}
              </Button>
            </div>
          </div>
        </div>
        
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetType="Chapter"
          targetId={chapterId!}
        />

        {/* Text Container */}
        <div className="flex-1 bg-card rounded-xl p-8 lg:p-12 border border-border shadow-sm">
           <h2 className="text-2xl font-bold mb-8 pb-4 border-b border-border/40">
             Chương {nav.chapter.number}{nav.chapter.title ? `: ${nav.chapter.title}` : ''}
           </h2>
           <article className="whitespace-pre-line text-lg leading-relaxed text-foreground/90">
             {body.data?.textBody}
           </article>

           {/* Bottom Navigation */}
           <div className="mt-12 pt-8 border-t border-border/40 flex justify-between items-center">
             <Button 
                onClick={() => nav.prev && navigate(`/content/${id}/read-novel/${nav.prev.id}`)}
                disabled={!nav.prev}
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Chương trước
              </Button>
              <Button 
                onClick={() => nav.next && navigate(`/content/${id}/read-novel/${nav.next.id}`)}
                disabled={!nav.next}
                variant="outline"
              >
                Chương sau <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
           </div>
           <div ref={chapterEndRef} aria-hidden="true" className="h-px" />
           {markChapterRead.isError && markChapterRead.variables?.chapterId === nav.chapter.id && (
             <button
               type="button"
               onClick={() => {
                 markedChapters.current.delete(nav.chapter!.id)
                 markChapterRead.mutate({ contentId: id, chapterId: nav.chapter!.id })
               }}
               className="mt-3 text-sm text-destructive hover:underline"
             >
               Không lưu được tiến độ. Nhấn để thử lại
             </button>
           )}
        </div>
      </div>

      {id && <CommentSection contentId={id} />}

    </div>
  )
}

export default ReadNovel
