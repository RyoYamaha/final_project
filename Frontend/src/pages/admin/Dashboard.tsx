import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'

export function AdminDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-review-queue'],
    queryFn: adminService.getReviewQueue,
  })

  const cards = [
    { label: 'Truyện chờ duyệt', value: data?.pendingContent.length ?? 0 },
    { label: 'Publisher chờ duyệt', value: data?.pendingPublisher.length ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan quản trị</h1>
      {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {isError && <p className="text-sm">Không tải được dữ liệu.</p>}
      {data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold">{c.value}</p>
            </div>
          ))}
        </div>
      )}
      <Link to="/admin/content/unpublished" className="text-sm underline underline-offset-4">
        Đến hàng chờ duyệt
      </Link>
      <p className="text-xs text-muted-foreground">Chưa có thống kê người dùng, lượt đọc vì backend chưa có endpoint.</p>
    </div>
  )
}
export default AdminDashboard
