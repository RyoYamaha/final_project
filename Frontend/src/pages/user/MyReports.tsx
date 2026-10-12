import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { reportService } from '@/services/report.service'
import { cn } from '@/lib/utils'

const statusLabels = {
  Pending: 'Đang chờ xem xét',
  Resolved: 'Đã giải quyết',
  Dismissed: 'Đã đóng',
} as const

const targetTypeLabels = {
  Content: 'Truyện',
  Chapter: 'Chapter',
  Comment: 'Bình luận',
  User: 'Người dùng',
} as const

export function MyReports() {
  const reportsQuery = useQuery({
    queryKey: ['my-reports'],
    queryFn: async () => (await reportService.getMyReports()).data,
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Báo cáo của tôi</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi trạng thái các báo cáo bạn đã gửi.
          </p>
        </div>
      </div>

      {reportsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Đang tải báo cáo...</p>
      )}

      {reportsQuery.isError && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">Không tải được báo cáo của bạn.</p>
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => reportsQuery.refetch()}
          >
            Thử lại
          </button>
        </div>
      )}

      {reportsQuery.data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Bạn chưa gửi báo cáo nào.
        </div>
      )}

      {!!reportsQuery.data?.length && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {reportsQuery.data.map((report) => (
            <li key={report.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  Báo cáo {targetTypeLabels[report.targetType].toLowerCase()}
                </span>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    report.status === 'Pending' && 'bg-yellow-500/10 text-yellow-600',
                    report.status === 'Resolved' && 'bg-green-500/10 text-green-600',
                    report.status === 'Dismissed' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {statusLabels[report.status]}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{report.reason}</p>
              <p className="text-xs text-muted-foreground">
                Gửi lúc {new Date(report.createdAt).toLocaleString('vi-VN')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default MyReports
