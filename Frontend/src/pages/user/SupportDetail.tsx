import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketService } from '@/services/ticket.service'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Send } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

export function SupportDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [reply, setReply] = useState('')

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => (await ticketService.getTicketDetails(id!)).data,
    enabled: !!id,
  })

  const replyMutation = useMutation({
    mutationFn: () => ticketService.replyTicket(id!, { body: reply }),
    onSuccess: () => {
      setReply('')
      qc.invalidateQueries({ queryKey: ['ticket', id] })
    },
  })

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (reply.trim().length >= 2) {
      replyMutation.mutate()
    }
  }

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>
  if (isError || !ticket) return <p className="text-destructive">Không tải được thông tin yêu cầu.</p>

  return (
    <div className="mx-auto max-w-4xl flex h-[calc(100vh-8rem)] flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/support')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <p className="text-xs text-muted-foreground">
            Mã yêu cầu: {ticket.id} • Trạng thái:{' '}
            <span className={ticket.status === 'Open' ? 'text-yellow-500' : ticket.status === 'AdminReplied' ? 'text-green-500' : ''}>
              {ticket.status}
            </span>
          </p>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {ticket.messages?.map((msg) => {
          const isMe = msg.senderId === user?.id
          const isAdmin = msg.sender?.role === 'Admin'

          return (
            <div
              key={msg.id}
              className={cn(
                "flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-2",
                isMe ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground",
                !isMe && isAdmin && "bg-blue-500/10 border border-blue-500/20"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold opacity-70">
                  {isAdmin ? 'Quản trị viên' : isMe ? 'Bạn' : msg.sender?.username}
                </span>
                <span className="text-[10px] opacity-60">
                  {new Date(msg.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.body}</p>
            </div>
          )
        })}
      </div>

      {/* Reply Input */}
      {ticket.status !== 'Closed' && (
        <form onSubmit={handleReply} className="flex items-end gap-2 border-t pt-4">
          <textarea
            required
            minLength={2}
            maxLength={2000}
            rows={2}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Nhập tin nhắn trả lời..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (reply.trim().length >= 2) handleReply(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[46px] w-[46px] rounded-xl shrink-0"
            disabled={replyMutation.isPending || reply.trim().length < 2}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      )}
    </div>
  )
}

export default SupportDetail
