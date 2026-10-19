import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Flag, Loader2, MessageSquare, Reply, Send } from 'lucide-react'
import { commentService, type CommentData } from '@/services/comment.service'
import { useAuthStore } from '@/stores/auth-store'
import { ReportModal } from '@/components/shared/ReportModal'

interface CommentSectionProps {
  contentId: string
}

interface CreateCommentVariables {
  body: string
  parentCommentId?: string
}

export function CommentSection({ contentId }: CommentSectionProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [commentText, setCommentText] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [commentToReport, setCommentToReport] = useState<string | null>(null)
  const [userToReport, setUserToReport] = useState<string | null>(null)

  const comments = useQuery({
    queryKey: ['comments', contentId],
    queryFn: () => commentService.getComments(contentId),
  })

  const createComment = useMutation({
    mutationFn: ({ body, parentCommentId }: CreateCommentVariables) =>
      commentService.createComment(contentId, body, parentCommentId),
    onSuccess: async (_comment, variables) => {
      if (variables.parentCommentId) {
        setReplyText('')
        setReplyingTo(null)
      } else {
        setCommentText('')
      }
      await queryClient.invalidateQueries({ queryKey: ['comments', contentId] })
    },
  })

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body = commentText.trim()
    if (!body || createComment.isPending) return
    createComment.mutate({ body })
  }

  const submitReply = (event: FormEvent<HTMLFormElement>, parentCommentId: string) => {
    event.preventDefault()
    const body = replyText.trim()
    if (!body || createComment.isPending) return
    createComment.mutate({ body, parentCommentId })
  }

  const renderComment = (comment: CommentData, isReply = false) => (
    <article key={comment.id} className={`flex gap-3 ${isReply ? 'mt-3' : ''}`}>
      <div className={`flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary ${isReply ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'}`}>
        {comment.user.username.slice(0, 2).toUpperCase() || 'U'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="group rounded-2xl rounded-tl-none border border-border bg-background p-3 text-sm shadow-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-foreground/80">{comment.user.username}</span>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setCommentToReport(comment.id)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive"
                title="Báo cáo bình luận"
                aria-label="Báo cáo bình luận"
              >
                <AlertTriangle className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setUserToReport(comment.user.id)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive"
                title="Báo cáo người dùng"
                aria-label="Báo cáo người dùng"
              >
                <Flag className="h-3 w-3" />
              </button>
            </span>
          </div>
          <p className="whitespace-pre-wrap break-words">{comment.body}</p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 px-1">
          <time className="text-[10px] text-muted-foreground">
            {new Date(comment.createdAt).toLocaleString('vi-VN')}
          </time>
          {!isReply && user && (
            <button
              type="button"
              onClick={() => {
                setReplyingTo((current) => current === comment.id ? null : comment.id)
                setReplyText('')
                createComment.reset()
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Reply className="h-3 w-3" />
              Trả lời
            </button>
          )}
        </div>

        {comment.replies?.map((reply) => renderComment(reply, true))}

        {!isReply && replyingTo === comment.id && (
          <form onSubmit={(event) => submitReply(event, comment.id)} className="mt-3 space-y-2">
            <textarea
              aria-label={`Trả lời ${comment.user.username}`}
              autoFocus
              maxLength={1000}
              rows={2}
              value={replyText}
              onChange={(event) => {
                setReplyText(event.target.value)
                createComment.reset()
              }}
              placeholder={`Trả lời ${comment.user.username}...`}
              disabled={createComment.isPending}
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
            {createComment.isError && createComment.variables?.parentCommentId === comment.id && (
              <p role="alert" className="text-xs text-destructive">Không gửi được phản hồi. Vui lòng thử lại.</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(null)
                  setReplyText('')
                  createComment.reset()
                }}
                className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!replyText.trim() || createComment.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Gửi phản hồi
              </button>
            </div>
          </form>
        )}
      </div>
    </article>
  )

  return (
    <section className="sticky top-24 flex h-[calc(100vh-8rem)] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-muted/30 lg:w-[350px]" aria-label="Bình luận">
      <header className="flex items-center gap-2 border-b border-border/50 bg-muted/50 p-4 font-bold">
        <MessageSquare className="h-5 w-5 text-primary" />
        Bình luận
        {comments.data && <span className="text-xs font-normal text-muted-foreground">({comments.data.length})</span>}
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {comments.isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : comments.isError ? (
          <p role="alert" className="text-center text-sm text-destructive">Không tải được bình luận. Vui lòng thử lại.</p>
        ) : comments.data && comments.data.length > 0 ? (
          comments.data.map((comment) => renderComment(comment))
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm italic text-muted-foreground">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        )}
      </div>

      <ReportModal
        isOpen={!!commentToReport}
        onClose={() => setCommentToReport(null)}
        targetType="Comment"
        targetId={commentToReport ?? ''}
      />
      <ReportModal
        isOpen={!!userToReport}
        onClose={() => setUserToReport(null)}
        targetType="User"
        targetId={userToReport ?? ''}
      />

      {user ? (
        <form onSubmit={submitComment} className="relative flex items-end gap-2 border-t border-border bg-background p-4">
          <textarea
            aria-label="Viết bình luận"
            maxLength={1000}
            rows={1}
            value={commentText}
            onChange={(event) => {
              setCommentText(event.target.value)
              createComment.reset()
            }}
            placeholder="Viết bình luận..."
            disabled={createComment.isPending}
            className="max-h-28 min-h-10 flex-1 resize-y rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="Gửi bình luận"
            disabled={!commentText.trim() || createComment.isPending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
          {createComment.isError && !createComment.variables?.parentCommentId && (
            <p role="alert" className="absolute bottom-16 left-4 right-4 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              Không gửi được bình luận. Vui lòng thử lại.
            </p>
          )}
        </form>
      ) : (
        <div className="border-t border-border bg-background p-4 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary hover:underline">Đăng nhập</Link> để bình luận và phản hồi.
        </div>
      )}
    </section>
  )
}

export default CommentSection
