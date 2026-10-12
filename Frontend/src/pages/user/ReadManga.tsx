import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contentService } from '@/services/content.service'
import { commentService } from '@/services/comment.service'
import { useChapterNav } from '@/hooks/useChapterNav'
import { ArrowLeft, ArrowRight, MessageSquare, ChevronRight, ImageOff, Send, Loader2, AlertTriangle, Flag } from 'lucide-react'
import { ReportModal } from '@/components/shared/ReportModal'

export function ReadManga() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nav = useChapterNav(id, chapterId)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [commentToReport, setCommentToReport] = useState<string | null>(null)
  const [userToReport, setUserToReport] = useState<string | null>(null)

  const pages = useQuery({
    queryKey: ['manga-pages', chapterId],
    enabled: !!chapterId,
    queryFn: async () =>
      (await contentService.getMangaChapterPages(chapterId!)).data,
  })

  // Comments Query
  const comments = useQuery({
    queryKey: ['comments', id],
    enabled: !!id,
    queryFn: () => commentService.getComments(id!),
  })

  const [commentText, setCommentText] = useState('')
  const addCommentMutation = useMutation({
    mutationFn: (body: string) => commentService.createComment(id!, body),
    onSuccess: () => {
      setCommentText('')
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
    },
  })

  const handlePostComment = (e: FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    addCommentMutation.mutate(commentText)
  }

  const [currentPageIndex, setCurrentPageIndex] = useState(0)

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

  const sorted = [...(pages.data ?? [])].sort((a, b) => a.pageNumber - b.pageNumber)
  const totalPages = sorted.length
  
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

      {/* RIGHT: COMMENT SECTION */}
      <div className="w-full lg:w-[350px] shrink-0 bg-muted/30 rounded-2xl border border-border/50 flex flex-col overflow-hidden h-[calc(100vh-8rem)] sticky top-24">
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/50">
          <div className="flex items-center gap-2 font-bold">
            <MessageSquare className="w-5 h-5 text-primary" />
            Comments
          </div>
          <button className="p-1 hover:bg-background rounded-full transition-colors">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {comments.isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : comments.data && comments.data.length > 0 ? (
            comments.data.map((comment: any) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {comment.user?.username?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="bg-background border border-border rounded-2xl rounded-tl-none p-3 text-sm shadow-sm flex flex-col relative group">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-xs text-foreground/80">{comment.user?.username || 'Unknown'}</span>
                      <button
                        onClick={() => setCommentToReport(comment.id)}
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-1 transition-opacity"
                        title="Báo cáo bình luận"
                      >
                        <AlertTriangle className="w-3 h-3" />
                      </button>
                      {comment.user?.id && (
                        <button
                          onClick={() => setUserToReport(comment.user.id)}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-1 transition-opacity"
                          title="Báo cáo người dùng"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <span>{comment.body}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 ml-1">{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm italic">
              Chưa có bình luận nào. Hãy là người đầu tiên!
            </div>
          )}
        </div>

        <ReportModal
          isOpen={!!commentToReport}
          onClose={() => setCommentToReport(null)}
          targetType="Comment"
          targetId={commentToReport || ''}
        />
        <ReportModal
          isOpen={!!userToReport}
          onClose={() => setUserToReport(null)}
          targetType="User"
          targetId={userToReport || ''}
        />

        <form onSubmit={handlePostComment} className="p-4 bg-background border-t border-border flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Write a comment..." 
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            disabled={addCommentMutation.isPending}
            className="flex-1 min-w-0 bg-muted border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={!commentText.trim() || addCommentMutation.isPending}
            className="w-10 h-10 shrink-0 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {addCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>

    </div>
  )
}

export default ReadManga
