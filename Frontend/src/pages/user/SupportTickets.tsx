import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketService } from '@/services/ticket.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageSquarePlus } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

export function SupportTickets() {
  const qc = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => (await ticketService.getMyTickets()).data,
  })

  const createMutation = useMutation({
    mutationFn: () => ticketService.createTicket({ subject, body }),
    onSuccess: () => {
      setIsCreating(false)
      setSubject('')
      setBody('')
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (subject.length >= 5 && body.length >= 10) {
      createMutation.mutate()
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hỗ trợ & Góp ý</h1>
        <Button onClick={() => setIsCreating(!isCreating)} variant="outline">
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Tạo yêu cầu mới
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Gửi yêu cầu hỗ trợ mới</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Chủ đề</label>
            <Input
              required
              minLength={5}
              maxLength={200}
              placeholder="Vấn đề bạn đang gặp phải..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nội dung chi tiết</label>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Mô tả chi tiết để Admin có thể giúp bạn tốt hơn..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending || subject.length < 5 || body.length < 10}>
              {createMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
              Hủy
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải hộp thư...</p>
      ) : data?.length === 0 ? (
        <div className="rounded-xl border border-border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Bạn chưa có yêu cầu hỗ trợ nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/support/${ticket.id}`}
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{ticket.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cập nhật lần cuối: {new Date(ticket.updatedAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      ticket.status === 'Open' ? 'bg-yellow-500/10 text-yellow-500' :
                      ticket.status === 'AdminReplied' ? 'bg-green-500/10 text-green-500' :
                      'bg-muted text-muted-foreground'
                    )}
                  >
                    {ticket.status === 'Open' ? 'Chờ phản hồi' :
                     ticket.status === 'AdminReplied' ? 'Đã phản hồi' : 'Đã đóng'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ticket._count?.messages} tin nhắn
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default SupportTickets
