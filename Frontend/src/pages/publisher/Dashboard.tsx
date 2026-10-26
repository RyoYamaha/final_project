import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  ChartNoAxesCombined,
  Library,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { publisherService } from '@/services/publisher.service'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const mockReadershipData = [
  { date: '01/10', views: 4200, bookmarks: 2400 },
  { date: '05/10', views: 5100, bookmarks: 3100 },
  { date: '10/10', views: 6800, bookmarks: 4200 },
  { date: '15/10', views: 8900, bookmarks: 5600 },
  { date: '20/10', views: 11200, bookmarks: 7100 },
  { date: '25/10', views: 14500, bookmarks: 9400 },
  { date: '30/10', views: 18200, bookmarks: 12100 },
]

const mockTopTitles = [
  { name: 'Solo Leveling', views: 42500 },
  { name: 'Toàn Trí Độc Giả', views: 31200 },
  { name: 'Ngự Linh Sư', views: 24800 },
  { name: 'Thế Giới Tu Tiên', views: 18400 },
]

export function PublisherDashboard() {
  const { data: contents, isLoading } = useQuery({
    queryKey: ['publisher-contents'],
    queryFn: () => publisherService.getMyContents().then((res) => res.data),
  })

  const totalSeries = contents?.length || 0
  const publishedCount = contents?.filter((c) => c.publicationStatus === 'Published').length || 0
  const pendingCount = contents?.filter((c) => c.publicationStatus === 'PendingApproval').length || 0
  const rejectedCount = contents?.filter((c) => c.publicationStatus === 'Rejected').length || 0

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* 1. HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white sm:text-3xl">Analytics Nhà Xuất Bản</h1>
            <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-bold text-amber-300">
              Licensed Partner
            </span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm mt-1">
            Theo dõi xu hướng độc giả, danh mục tác phẩm có bản quyền và quản lý doanh thu toàn hệ thống.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-xl border-white/10">
            <Link to="/earnings">
              <ChartNoAxesCombined className="mr-1.5 h-4 w-4 text-primary" /> Payout & Doanh thu
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="rounded-xl border-white/10">
            <Link to="/publisher/catalog">
              <Library className="mr-1.5 h-4 w-4 text-sky-400" /> Quản lý danh mục
            </Link>
          </Button>

          <Button asChild size="sm" className="rounded-xl font-semibold shadow-md shadow-primary/20">
            <Link to="/publisher/create">
              <Plus className="mr-1.5 h-4 w-4" /> Xuất bản truyện mới
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#252f3b] p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">Tổng số tác phẩm</p>
          <p className="mt-2 text-3xl font-black text-white">{isLoading ? '...' : totalSeries}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Manga & Novel bản quyền</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-400">Đang phát hành</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-400">{isLoading ? '...' : publishedCount}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Hoạt động bình thường</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-400">Đang chờ duyệt</p>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-amber-400">{isLoading ? '...' : pendingCount}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Trong hàng đợi admin</p>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-rose-400">Cần chỉnh sửa</p>
            <XCircle className="h-4 w-4 text-rose-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-rose-400">{isLoading ? '...' : rejectedCount}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Xem phản hồi admin</p>
        </div>
      </div>

      {/* 3. CHARTS */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#252f3b] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Xu hướng độc giả (Lượt xem & Bookmark)</h3>
              <p className="text-xs text-muted-foreground">Theo dõi tăng trưởng trong 30 ngày qua</p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockReadershipData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e2631',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line type="monotone" dataKey="views" stroke="#f2b84b" strokeWidth={2.5} name="Lượt đọc" />
                <Line type="monotone" dataKey="bookmarks" stroke="#60a5fa" strokeWidth={2} name="Bookmark" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#252f3b] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Top truyện đọc nhiều nhất</h3>
              <p className="text-xs text-muted-foreground">Tác phẩm mang lại tương tác cao nhất</p>
            </div>
            <BarChart3 className="h-4 w-4 text-sky-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTopTitles} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" width={110} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e2631',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="views" fill="#f2b84b" radius={[0, 6, 6, 0]} name="Lượt đọc" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublisherDashboard
