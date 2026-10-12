import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { notificationService } from '@/services/notification.service'
import { cn } from '@/lib/utils'

export function Inbox() {
  const queryClient = useQueryClient()

  const { data: notifications, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await notificationService.getAll()).data,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['unread-count'] })
  }

  const markRead = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: refresh,
  })

  const markAll = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: refresh,
  })

  const hasUnread = !!notifications?.some((notification) => !notification.isRead)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hộp thư</h1>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasUnread || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}

      {isError && (
        <div className="space-y-2">
          <p className="text-sm">Không tải được thông báo.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      {notifications && notifications.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có thông báo nào.</p>
      )}

      {notifications && notifications.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                disabled={notification.isRead || markRead.isPending}
                onClick={() => markRead.mutate(notification.id)}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left text-sm',
                  notification.isRead ? 'text-muted-foreground' : 'bg-primary/5 font-medium hover:bg-primary/10',
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                    notification.isRead ? 'bg-transparent' : 'bg-primary',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block">{notification.message}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString('vi-VN')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Inbox
