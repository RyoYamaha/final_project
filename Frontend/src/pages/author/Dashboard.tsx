import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Plus,
  Languages,
  Bookmark,
  Star,
  MessageSquare,
  ChartNoAxesCombined,
  AlertCircle,
} from 'lucide-react'
import { authorService } from '@/services/author.service'
import { Button } from '@/components/ui/button'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  Published: {
    label: 'Đã xuất bản',
    className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  PendingApproval: {
    label: 'Chờ admin duyệt',
    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  Draft: {
    label: 'Bản nháp',
    className: 'text-muted-foreground bg-white/5 border-white/10',
  },
  Rejected: {
    label: 'Bị từ chối',
    className: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  },
}

export function AuthorDashboard() {
  const stats = useQuery({ queryKey: ['author-dashboard'], queryFn: authorService.getDashboard })
  const myContents = useQuery({ queryKey: ['author-contents'], queryFn: authorService.getMyContents })

  const cards = stats.data && [
    { label: 'Tác phẩm / Bản dịch', value: stats.data.totalTranslations, icon: BookOpen, color: 'text-sky-400' },
    { label: 'Lượt Bookmark', value: stats.data.bookmarkCount, icon: Bookmark, color: 'text-amber-400' },
    {
      label: 'Đánh giá trung bình',
      value: stats.data.ratingCount > 0 ? `${(stats.data.averageRating ?? 0).toFixed(1)} ★` : '—',
      icon: Star,
      color: 'text-yellow-400',
    },
    { label: 'Lượt đánh giá', value: stats.data.ratingCount, icon: Star, color: 'text-orange-400' },
    { label: 'Bình luận thảo luận', value: stats.data.commentCount, icon: MessageSquare, color: 'text-purple-400' },
  ]

  const contents = myContents.data ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* 1. WORKSPACE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Workspace Tác Giả & Dịch Giả</h1>
          <p className="text-xs text-muted-foreground sm:text-sm mt-1">
            Quản lý sáng tác Manga, Novel và đăng tải bản dịch cộng đồng cho các tác phẩm bản quyền.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-xl border-white/10">
            <Link to="/earnings">
              <ChartNoAxesCombined className="mr-1.5 h-4 w-4 text-primary" /> Doanh thu & Rút coin
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="rounded-xl border-white/10">
            <Link to="/author/upload/translation">
              <Languages className="mr-1.5 h-4 w-4 text-purple-400" /> Đăng bản dịch
            </Link>
          </Button>

          <Button asChild size="sm" className="rounded-xl font-semibold shadow-md shadow-primary/20">
            <Link to="/author/create">
              <Plus className="mr-1.5 h-4 w-4" /> Tạo truyện mới
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      {stats.isLoading ? (
        <div className="flex justify-center py-6 text-sm text-muted-foreground">Đang tải thống kê...</div>
      ) : cards ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => {
            const Icon = c.icon
            return (
              <div
                key={c.label}
                className="rounded-2xl border border-white/10 bg-[#252f3b] p-4 shadow-sm transition-all hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                  <Icon className={`h-4 w-4 ${c.color}`} />
                </div>
                <p className="mt-2 text-2xl font-black text-white">{c.value}</p>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* 3. STORIES MANAGEMENT LIST */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Danh sách tác phẩm ({contents.length})</h2>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-white">
            <Link to="/author/create">Thêm tác phẩm</Link>
          </Button>
        </div>

        {myContents.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Đang tải danh sách tác phẩm...</p>
        ) : contents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#252f3b]/50 py-14 text-center text-muted-foreground space-y-3">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="text-base font-semibold text-white">Bạn chưa có tác phẩm nào</p>
            <p className="text-xs max-w-sm mx-auto">
              Bắt đầu sáng tác truyện tranh, tiểu thuyết mới hoặc đăng ký bản dịch fan translation cho các truyện có bản quyền.
            </p>
            <Button asChild size="sm" className="mt-2 rounded-xl">
              <Link to="/author/create">Tạo truyện ngay</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {contents.map((c) => {
              const badge = STATUS_BADGE[c.publicationStatus] ?? {
                label: c.publicationStatus,
                className: 'text-muted-foreground bg-white/5 border-white/10',
              }

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-white/10 bg-[#252f3b] p-4 shadow-sm transition-all hover:border-white/20 space-y-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-muted">
                        {c.coverImageUrl ? (
                          <img src={c.coverImageUrl} alt={c.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                            {c.type}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-base text-white">{c.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-slate-300">
                            {c.type} · {c.ownershipTier === 'Licensed' ? 'Bản quyền' : c.ownershipTier === 'Original' ? 'Sáng tác gốc' : 'Bản dịch cộng đồng'}
                          </span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="rounded-xl border-white/10">
                        <Link to={`/author/content/${c.id}/edit`}>Sửa thông tin</Link>
                      </Button>
                      <Button asChild size="sm" className="rounded-xl font-semibold shadow-sm">
                        <Link to={`/author/content/${c.id}/chapters/new`}>+ Đăng chapter</Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="rounded-xl text-xs hover:bg-white/5">
                        <Link to={`/content/${c.id}`}>Xem trang đọc</Link>
                      </Button>
                    </div>
                  </div>

                  {/* Rejection feedback */}
                  {c.publicationStatus === 'Rejected' && c.reviewFeedback && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <span className="font-bold">Lý do từ chối từ Admin:</span> {c.reviewFeedback}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default AuthorDashboard
