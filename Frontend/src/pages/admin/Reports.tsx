import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppDialog } from '@/components/common/AppDialogProvider'
import {
  reportService,
  type ReportStatus,
} from '@/services/report.service'

const statusFilters: Array<{ label: string; value?: ReportStatus }> = [
  { label: 'Tất cả' },
  { label: 'Chờ xử lý', value: 'Pending' },
  { label: 'Đã giải quyết', value: 'Resolved' },
  { label: 'Đã bỏ qua', value: 'Dismissed' },
]

const statusLabels: Record<ReportStatus, string> = {
  Pending: 'Chờ xử lý',
  Resolved: 'Đã giải quyết',
  Dismissed: 'Đã bỏ qua',
}

const targetTypeLabels = {
  Content: 'Truyện',
  Chapter: 'Chapter',
  Comment: 'Bình luận',
  User: 'Người dùng',
} as const

export function Reports() {
  const queryClient = useQueryClient()
  const { confirm } = useAppDialog()
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>()
  const [selectedReportId, setSelectedReportId] = useState<string>()

  const reportsQuery = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: async () => (await reportService.getAllReports(statusFilter)).data,
  })
  const reports = reportsQuery.data ?? []

  useEffect(() => {
    if (reports.length === 0) {
      setSelectedReportId(undefined)
      return
    }

    const selectedReportStillVisible = reports.some(
      (report) => report.id === selectedReportId,
    )
    if (!selectedReportStillVisible) {
      setSelectedReportId(reports[0].id)
    }
  }, [reports, selectedReportId])

  const selectedReportQuery = useQuery({
    queryKey: ['admin-report', selectedReportId],
    queryFn: async () => (await reportService.getReportById(selectedReportId!)).data,
    enabled: !!selectedReportId,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (action: 'dismiss' | 'resolve') => {
      if (!selectedReportId) {
        throw new Error('Chưa chọn báo cáo cần xử lý')
      }
      return action === 'resolve'
        ? reportService.resolveReport(selectedReportId)
        : reportService.dismissReport(selectedReportId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-report', selectedReportId] }),
      ])
    },
  })

  const report = selectedReportQuery.data

  const confirmReportAction = async (action: 'dismiss' | 'resolve') => {
    if (!report) return
    const resolved = action === 'resolve'
    const confirmed = await confirm({
      title: resolved ? 'Xác nhận giải quyết báo cáo' : 'Xác nhận bỏ qua báo cáo',
      description: `${resolved ? 'Đánh dấu đã giải quyết' : 'Bỏ qua'} báo cáo về ${targetTypeLabels[report.targetType].toLowerCase()} này?`,
      confirmLabel: resolved ? 'Đã giải quyết' : 'Bỏ qua báo cáo',
      tone: resolved ? 'default' : 'destructive',
    })
    if (confirmed) updateStatusMutation.mutate(action)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Flag className="h-6 w-6 text-destructive" />
        <div>
          <h1 className="text-2xl font-bold">Báo cáo vi phạm</h1>
          <p className="text-sm text-muted-foreground">
            Xem báo cáo do người dùng gửi và cập nhật kết quả xử lý.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Button
            key={filter.label}
            type="button"
            size="sm"
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="flex min-h-[520px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border sm:w-96">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Danh sách báo cáo</h2>
            <p className="text-xs text-muted-foreground">{reports.length} báo cáo</p>
          </div>

          {reportsQuery.isLoading && (
            <p className="p-4 text-sm text-muted-foreground">Đang tải báo cáo...</p>
          )}
          {reportsQuery.isError && (
            <div className="space-y-2 p-4">
              <p className="text-sm text-destructive">Không tải được danh sách báo cáo.</p>
              <Button size="sm" variant="outline" onClick={() => reportsQuery.refetch()}>
                Thử lại
              </Button>
            </div>
          )}
          {!reportsQuery.isLoading && !reportsQuery.isError && reports.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Không có báo cáo nào trong trạng thái này.
            </p>
          )}

          {reports.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedReportId(item.id)}
              className={cn(
                'w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent',
                selectedReportId === item.id && 'bg-primary/10 hover:bg-primary/10',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {item.reporter?.username ?? item.reporterId}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <p className="mt-1 truncate text-sm">{item.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {targetTypeLabels[item.targetType]} · {statusLabels[item.status]}
              </p>
            </button>
          ))}
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {!selectedReportId && (
            <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Flag className="h-10 w-10" />
              <p>Chọn một báo cáo để xem chi tiết.</p>
            </div>
          )}

          {selectedReportId && selectedReportQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Đang tải chi tiết báo cáo...</p>
          )}
          {selectedReportId && selectedReportQuery.isError && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Không tải được chi tiết báo cáo.</p>
              <Button size="sm" variant="outline" onClick={() => selectedReportQuery.refetch()}>
                Thử lại
              </Button>
            </div>
          )}

          {report && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    Báo cáo {targetTypeLabels[report.targetType].toLowerCase()}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Gửi lúc {new Date(report.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
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

              <dl className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Người gửi</dt>
                  <dd className="mt-1 font-medium">
                    {report.reporter?.username ?? report.reporterId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Đối tượng bị báo cáo</dt>
                  <dd className="mt-1 font-medium">
                    {targetTypeLabels[report.targetType]} · {report.targetId}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2">
                <h3 className="font-semibold">Lý do</h3>
                <p className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
                  {report.reason}
                </p>
              </div>

              {report.evidence && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Bằng chứng</h3>
                  <p className="break-all rounded-lg bg-muted p-4 text-sm">
                    {report.evidence}
                  </p>
                </div>
              )}

              {report.status === 'Pending' && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    disabled={updateStatusMutation.isPending}
                    onClick={() => void confirmReportAction('resolve')}
                  >
                    Đánh dấu đã giải quyết
                  </Button>
                  <Button
                    variant="outline"
                    disabled={updateStatusMutation.isPending}
                    onClick={() => void confirmReportAction('dismiss')}
                  >
                    Bỏ qua báo cáo
                  </Button>
                </div>
              )}

              {updateStatusMutation.isError && (
                <p className="text-sm text-destructive">
                  Không cập nhật được trạng thái. Vui lòng thử lại.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Reports
