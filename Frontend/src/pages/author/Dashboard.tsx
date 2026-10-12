import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { authorService } from '@/services/author.service'
import { Button } from '@/components/ui/button'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  Published:        { label: '🟢 Đã xuất bản',   className: 'text-green-600 bg-green-500/10 border-green-500/30' },
  PendingApproval:  { label: '🟡 Chờ admin duyệt', className: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
  Draft:            { label: '⚪ Bản nháp',         className: 'text-muted-foreground bg-muted/40 border-border' },
  Rejected:         { label: '🔴 Bị từ chối',       className: 'text-red-600 bg-red-500/10 border-red-500/30' },
}

export function AuthorDashboard() {
  const stats = useQuery({ queryKey: ['author-dashboard'], queryFn: authorService.getDashboard })
  const myContents = useQuery({ queryKey: ['author-contents'], queryFn: authorService.getMyContents })

  const cards = stats.data && [
    { label: 'Bản dịch', value: stats.data.totalTranslations },
    { label: 'Lượt bookmark', value: stats.data.bookmarkCount },
    {
      label: 'Điểm trung bình',
      value: stats.data.ratingCount > 0 ? (stats.data.averageRating ?? 0).toFixed(1) : '—',
    },
    { label: 'Lượt đánh giá', value: stats.data.ratingCount },
    { label: 'Bình luận', value: stats.data.commentCount },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bảng điều khiển Tác giả</h1>
        <Button asChild size="sm">
          <Link to="/author/upload/translation">Đăng bản dịch</Link>
        </Button>
      </div>

      {stats.isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {stats.isError && <p className="text-sm">Không tải được thống kê.</p>}

      {cards && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Truyện của bạn (Sáng tác & Dịch)</h2>
        {myContents.isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
        {myContents.data?.length === 0 && <p className="text-sm text-muted-foreground">Chưa có truyện nào.</p>}
        <ul className="divide-y divide-border rounded-lg border border-border">
          {myContents.data?.map((c) => {
            const badge = STATUS_BADGE[c.publicationStatus] ?? { label: c.publicationStatus, className: 'text-muted-foreground bg-muted/40 border-border' }
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-lg">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{c.type} · {c.ownershipTier === 'Licensed' ? 'Bản quyền' : c.ownershipTier === 'Original' ? 'Sáng tác gốc' : 'Bản dịch'}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  {c.publicationStatus === 'Rejected' && c.reviewFeedback && (
                    <p className="mt-2 rounded-md border border-red-500/20 bg-red-500/5 p-2 text-sm text-red-700">
                      Phản hồi từ quản trị viên: {c.reviewFeedback}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/author/content/${c.id}/edit`}>Quản lý / Edit</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to={`/author/content/${c.id}/chapters/new`}>Đăng chapter</Link>
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
export default AuthorDashboard
