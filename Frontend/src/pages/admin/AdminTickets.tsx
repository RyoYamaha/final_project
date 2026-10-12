import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { ticketService } from '@/services/ticket.service'

export function AdminTickets() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)
  const [selectedTicketId, setSelectedTicketId] = useState<string>()
  const [replyText, setReplyText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const ticketsQuery = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => (await ticketService.getAllTickets()).data,
    refetchInterval: 10_000,
  })
  const tickets = ticketsQuery.data ?? []
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId)

  useEffect(() => {
    if (tickets.length === 0) {
      setSelectedTicketId(undefined)
      return
    }

    const selectedTicketStillExists = tickets.some(
      (ticket) => ticket.id === selectedTicketId,
    )
    if (!selectedTicketStillExists) {
      setSelectedTicketId(tickets[0].id)
    }
  }, [tickets, selectedTicketId])

  const conversationQuery = useQuery({
    queryKey: ['admin-ticket-conversation', selectedTicketId],
    queryFn: async () => (await ticketService.getTicketDetails(selectedTicketId!)).data,
    enabled: !!selectedTicketId,
    refetchInterval: 5_000,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationQuery.data?.messages])

  const replyMutation = useMutation({
    mutationFn: () =>
      ticketService.replyTicket(selectedTicketId!, { body: replyText.trim() }),
    onSuccess: async () => {
      setReplyText('')
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin-ticket-conversation', selectedTicketId],
        }),
        queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }),
      ])
    },
  })

  const handleReply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (replyText.trim().length >= 2 && selectedTicketId) {
      replyMutation.mutate()
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Hộp thư hỗ trợ</h1>

      <div className="flex h-[calc(100vh-9rem)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <aside className="flex w-72 shrink-0 flex-col border-r border-border sm:w-80">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Cuộc hội thoại</h2>
            <p className="text-xs text-muted-foreground">
              {tickets.length} yêu cầu hỗ trợ
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {ticketsQuery.isLoading && (
              <p className="p-4 text-sm text-muted-foreground">Đang tải yêu cầu...</p>
            )}
            {ticketsQuery.isError && (
              <div className="space-y-2 p-4">
                <p className="text-sm text-destructive">Không tải được danh sách yêu cầu.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => ticketsQuery.refetch()}
                >
                  Thử lại
                </Button>
              </div>
            )}
            {!ticketsQuery.isLoading && !ticketsQuery.isError && tickets.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                Chưa có yêu cầu hỗ trợ nào.
              </p>
            )}

            {tickets.map((ticket) => {
              const latestMessage = ticket.messages?.[0]
              const isSelected = ticket.id === selectedTicketId

              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={cn(
                    'w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent',
                    isSelected && 'bg-primary/10 hover:bg-primary/10',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-medium">
                      {ticket.user?.username ?? ticket.userId}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(ticket.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm">{ticket.subject}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {latestMessage?.sender?.role === 'Admin' ? 'Bạn: ' : ''}
                    {latestMessage?.body ?? 'Chưa có tin nhắn'}
                  </p>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {selectedTicket ? (
            <>
              <header className="border-b border-border px-4 py-3">
                <h2 className="truncate font-semibold">
                  {selectedTicket.user?.username ?? selectedTicket.userId}
                </h2>
                <p className="truncate text-sm text-muted-foreground">
                  {selectedTicket.subject}
                </p>
              </header>

              {conversationQuery.isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Đang tải hội thoại...</p>
              ) : conversationQuery.isError || !conversationQuery.data ? (
                <div className="space-y-2 p-4">
                  <p className="text-sm text-destructive">Không tải được hội thoại.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => conversationQuery.refetch()}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {conversationQuery.data.messages?.map((message) => {
                      const isAdminMessage = message.senderId === currentUser?.id

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'flex flex-col gap-1 rounded-2xl px-4 py-2',
                            'max-w-[85%] sm:max-w-[75%]',
                            isAdminMessage
                              ? 'ml-auto bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground',
                          )}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-semibold opacity-70">
                              {isAdminMessage
                                ? 'Bạn'
                                : message.sender?.username ?? selectedTicket.user?.username}
                            </span>
                            <span className="shrink-0 text-[10px] opacity-60">
                              {new Date(message.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.body}
                          </p>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleReply} className="flex items-end gap-2 border-t border-border p-3">
                    <textarea
                      required
                      minLength={2}
                      maxLength={2000}
                      rows={2}
                      className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Nhập tin nhắn trả lời..."
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-xl"
                      disabled={replyMutation.isPending || replyText.trim().length < 2}
                      aria-label="Gửi phản hồi"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                  {replyMutation.isError && (
                    <p className="px-4 pb-3 text-sm text-destructive">
                      Gửi phản hồi thất bại. Vui lòng thử lại.
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10" />
              <p>Chọn một yêu cầu để xem và trả lời hội thoại.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default AdminTickets
